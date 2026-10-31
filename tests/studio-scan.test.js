// Run: node --test tests/*.test.js
// The Studio scan must only reach public websites: blocked ranges, IP literals, and one DNS lookup per connection
// (the address that was checked is the address that is used). Local server only, no outside network.
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const zlib = require("node:zlib");
const dns = require("node:dns");
const { privateIp, checkUrl, get } = require("../api/studio-scan.js")._test;

function server(handler) {
  return new Promise(resolve => { const s = http.createServer(handler).listen(0, "127.0.0.1", () => resolve(s)); });
}
const page = (res, html, headers = {}) => { res.writeHead(200, { "content-type": "text/html", ...headers }); res.end(html); };
function allowLocal(on) {
  if (on) { process.env.NODE_ENV = "test"; process.env.STUDIO_ALLOW_PRIVATE = "1"; }
  else { delete process.env.NODE_ENV; delete process.env.STUDIO_ALLOW_PRIVATE; }
}
test.afterEach(() => allowLocal(false));

test("blocks private, reserved and IPv4-carrying IPv6 addresses", () => {
  for (const ip of ["10.1.2.3", "127.0.0.1", "0.0.0.0", "169.254.169.254", "172.16.0.1", "172.31.255.255", "192.168.1.1", "100.64.0.1",
    "198.18.0.1", "198.19.255.255", "192.0.0.8", "224.0.0.1", "255.255.255.255", "::", "::1", "::7f00:1", "::ffff:127.0.0.1", "::ffff:7f00:1",
    "::ffff:a9fe:a9fe", "::ffff:0:7f00:1", "64:ff9b::7f00:1", "2002:7f00:1::1", "2001:0:4136:e378::1", "fc00::1", "fd12::1", "fe80::1", "ff02::1", "not an ip"])
    assert.strictEqual(privateIp(ip), true, ip);
  for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "198.20.0.1", "100.128.0.1", "2606:4700:4700::1111", "2a00:1450:4001::200e", "::ffff:8.8.8.8"])
    assert.strictEqual(privateIp(ip), false, ip);
});

test("refuses private IP literals and non-web schemes before connecting", () => {
  for (const u of ["http://127.0.0.1/", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "https://169.254.169.254/latest", "http://0x7f.1/", "http://2130706433/"])
    assert.throws(() => checkUrl(u), /isn't a public website/, u);
  assert.throws(() => checkUrl("ftp://example.com/"), /Only http and https/);
  assert.throws(() => checkUrl("http://"), /doesn't look like a web address/);
  assert.throws(() => checkUrl("https://user:pass@example.com/"), /Leave the sign-in out/);
  assert.strictEqual(checkUrl("example.com").href, "https://example.com/");
});

test("a hostname that resolves to a private address is refused at connect time", async () => {
  const s = await server((req, res) => page(res, "<p>secret</p>"));
  try {
    await assert.rejects(get(`http://localhost:${s.address().port}/`), /isn't a public website/);
  } finally { s.close(); }
});

test("DNS is looked up once per connection, by the connection itself", async () => {
  const s = await server((req, res) => page(res, "<title>Hi</title>"));
  const real = dns.lookup; let n = 0;
  dns.lookup = (...a) => { n++; return real(...a); };
  allowLocal(true);
  try {
    const r = await get(`http://localhost:${s.address().port}/`);
    assert.match(r.html, /Hi/);
    assert.strictEqual(n, 1);
  } finally { dns.lookup = real; s.close(); }
});

test("follows redirects, re-checking each hop, and stops after 4", async () => {
  const s = await server((req, res) => {
    const hop = Number(req.url.slice(1)) || 0;
    if (req.url === "/ftp") { res.writeHead(302, { location: "ftp://example.com/" }); return res.end(); }
    if (hop < 9) { res.writeHead(302, { location: "/" + (hop + 1) }); return res.end(); }
    page(res, "<p>end</p>");
  });
  allowLocal(true);
  const base = `http://localhost:${s.address().port}`;
  try {
    assert.strictEqual((await get(base + "/6")).url, base + "/9");
    await assert.rejects(get(base + "/1"), /Too many redirects/);
    await assert.rejects(get(base + "/ftp"), /Only http and https/);
  } finally { s.close(); }
});

test("reads compressed pages, caps the size after decompression, and refuses non-HTML and errors", async () => {
  const big = "<p>" + "a".repeat(3_000_000) + "</p>";
  const s = await server((req, res) => {
    if (req.url === "/gz") return page(res, zlib.gzipSync("<h1>Zipped</h1>"), { "content-encoding": "gzip" });
    if (req.url === "/br") return page(res, zlib.brotliCompressSync("<h1>Brotli</h1>"), { "content-encoding": "br" });
    if (req.url === "/bomb") return page(res, zlib.gzipSync(big), { "content-encoding": "gzip" });
    if (req.url === "/big") return page(res, big);
    if (req.url === "/json") { res.writeHead(200, { "content-type": "application/json" }); return res.end("{}"); }
    res.writeHead(404); res.end();
  });
  allowLocal(true);
  const base = `http://localhost:${s.address().port}`;
  try {
    assert.match((await get(base + "/gz")).html, /Zipped/);
    assert.match((await get(base + "/br")).html, /Brotli/);
    assert.strictEqual((await get(base + "/bomb")).html.length, 2_000_000);
    assert.strictEqual((await get(base + "/big")).html.length, 2_000_000);
    await assert.rejects(get(base + "/json"), /isn't a web page/);
    await assert.rejects(get(base + "/missing"), /answered 404/);
  } finally { s.close(); }
});

test("a DNS answer with any private address is refused whole, on the all-addresses path too", async () => {
  const real = dns.lookup;
  dns.lookup = (host, opts, cb) => cb(null, [{ address: "93.184.216.34", family: 4 }, { address: "10.0.0.5", family: 4 }]);
  try {
    await assert.rejects(get("http://mixed.example/"), /isn't a public website/);
  } finally { dns.lookup = real; }
});

test("odd but common encodings are read; a cut-off zipped page keeps what arrived; unknown ones are refused", async () => {
  const gz = zlib.gzipSync("<h1>Zipped page</h1>");
  const s = await server((req, res) => {
    if (req.url === "/xgzip") return page(res, gz, { "content-encoding": "x-gzip" });
    if (req.url === "/list") return page(res, gz, { "content-encoding": "GZIP, identity" });
    if (req.url === "/cut") return page(res, gz.subarray(0, gz.length - 8), { "content-encoding": "gzip" });
    if (req.url === "/empty") return page(res, "", { "content-encoding": "gzip" });
    if (req.url === "/stack") return page(res, gz, { "content-encoding": "gzip, br" });
  });
  allowLocal(true);
  const base = `http://localhost:${s.address().port}`;
  try {
    assert.match((await get(base + "/xgzip")).html, /Zipped page/);
    assert.match((await get(base + "/list")).html, /Zipped page/);
    assert.match((await get(base + "/cut")).html, /Zipped page/);
    assert.strictEqual((await get(base + "/empty")).html, "");
    await assert.rejects(get(base + "/stack"), /format the Studio can't read/);
  } finally { s.close(); }
});

test("socket errors are shown plainly, without addresses or ports", async () => {
  const s = await server(() => {}); const port = s.address().port; s.close();
  allowLocal(true);
  await assert.rejects(get(`http://localhost:${port}/`), e => e.message === "Couldn't read that site");
});

test("errType keeps only a plain error type", async () => {
  const errType = require("../api/_errtype.js");
  const r = b => new Response(typeof b === "string" ? b : JSON.stringify(b));
  assert.strictEqual(await errType(r({ error: { type: "overloaded_error", message: "Customer: secret" } })), "overloaded_error");
  for (const b of [{ error: {} }, { error: { type: ["a"] } }, { error: { type: "has spaces and Customer text" } }, "<html>oops</html>", {}])
    assert.strictEqual(await errType(r(b)), "unknown", JSON.stringify(b));
});
