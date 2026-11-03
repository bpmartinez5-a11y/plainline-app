// Run: node --test tests/*.test.js
// The walkthrough request endpoint (api/lead.js) against a fake Supabase. Locks in: only this site may call it,
// only the four form fields reach the table, a bot's hidden field saves nothing, and one IP can't fill the hour.
const test = require("node:test");
const assert = require("node:assert");
const handler = require("../api/lead.js");

const realFetch = globalThis.fetch;
const URL_OK = "https://mtpaaizladkfjtpnkdao.supabase.co";
let ipSeq = 0;

function install(status = 201, text = "") {
  const calls = [];
  globalThis.fetch = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); return new Response(text, { status }); };
  return calls;
}
function call({ method = "POST", body = { name: "Ana", email: "ana@example.com", message: "Quotes pile up", source: "website" }, origin = "https://plainlineops.com", ip } = {}) {
  const headers = { host: "plainlineops.com", "x-forwarded-for": ip || "10.2." + (++ipSeq) + ".1", "sec-fetch-site": "same-origin" };
  if (origin) headers.origin = origin;
  return new Promise(resolve => {
    let code = 200;
    const res = { setHeader() {}, status(c) { code = c; return this; }, json(o) { resolve({ code, out: o }); } };
    handler({ method, headers, body: JSON.stringify(body) }, res);
  });
}

test.beforeEach(() => { process.env.SUPABASE_URL = URL_OK; process.env.SUPABASE_SECRET_KEY = "sb_secret_test"; });
test.afterEach(() => { globalThis.fetch = realFetch; });
test.after(() => { delete process.env.SUPABASE_URL; delete process.env.SUPABASE_SECRET_KEY; });

test("saves only the four columns, with the server key", async () => {
  const calls = install();
  const { code } = await call({ body: { name: " Ana ", email: "ana@example.com", message: "", source: "website chat · google/kc", extra: "x", created_at: "2000-01-01" } });
  assert.strictEqual(code, 200);
  assert.strictEqual(calls[0].url, URL_OK + "/rest/v1/leads");
  assert.deepStrictEqual(calls[0].body, { name: "Ana", email: "ana@example.com", message: null, source: "website chat · google/kc" });
  assert.strictEqual(calls[0].opts.headers.apikey, "sb_secret_test");
  assert.strictEqual(calls[0].opts.headers.Authorization, undefined);
});

test("other sites, scripts without an Origin and GETs are refused", async () => {
  const calls = install();
  assert.strictEqual((await call({ origin: "https://evil.example" })).code, 403);
  assert.strictEqual((await call({ origin: null })).code, 403);
  assert.strictEqual((await call({ method: "GET" })).code, 405);
  assert.strictEqual(calls.length, 0);
});

test("a filled hidden field gets a thank-you and saves nothing", async () => {
  const calls = install();
  const { code, out } = await call({ body: { name: "Bot", email: "b@x.io", website: "http://spam" } });
  assert.deepStrictEqual([code, out], [200, { ok: true }]);
  assert.strictEqual(calls.length, 0);
});

test("bad input is refused before the database", async () => {
  const calls = install();
  for (const body of [{ email: "a@b.co" }, { name: "A", email: "nope" }, { name: "A", email: "a@b.co", message: "x".repeat(5001) },
    { name: "x".repeat(201), email: "a@b.co" }, { name: "A", email: "a@b.co", source: "admin import" }]) assert.strictEqual((await call({ body })).code, 400, JSON.stringify(body).slice(0, 60));
  assert.strictEqual(calls.length, 0);
});

test("one IP gets 3 an hour", async () => {
  const calls = install();
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await call({ ip: "10.9.9.9" })).code);
  assert.deepStrictEqual(codes, [200, 200, 200, 429, 429]);
  assert.strictEqual(calls.length, 3);
});

test("the database cap shows as 429, other failures as 502", async () => {
  install(400, '{"message":"too many inquiries right now, try again later"}');
  assert.strictEqual((await call()).code, 429);
  install(500);
  assert.strictEqual((await call()).code, 502);
  globalThis.fetch = async () => { throw new TypeError("network"); };
  assert.strictEqual((await call()).code, 502);
});

test("no key, or a key for another project, is 501", async () => {
  install();
  delete process.env.SUPABASE_SECRET_KEY;
  assert.strictEqual((await call()).code, 501);
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test"; process.env.SUPABASE_URL = "https://other.supabase.co";
  assert.strictEqual((await call()).code, 501);
});
