// Run: node --test tests/*.test.js
// The walkthrough request endpoint (api/lead.js) against a fake Supabase. Locks in: only this site may call it,
// only the four form fields reach the table, a bot's hidden field saves nothing, and one IP can't fill the hour.
const test = require("node:test");
const assert = require("node:assert");
const handler = require("../api/lead.js");
const { qualify } = require("../qualify.js");

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
  const { code } = await call({ body: { name: " Ana ", email: "ana@example.com", message: "", source: "website chat · google/kc", extra: "x", created_at: "2000-01-01", fit: "fit" } });
  assert.strictEqual(code, 200);
  assert.strictEqual(calls[0].url, URL_OK + "/rest/v1/leads");
  assert.deepStrictEqual(calls[0].body, { name: "Ana", email: "ana@example.com", message: qualify({}).line, source: "website chat · google/kc" });
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
  assert.strictEqual(calls.filter((c) => c.url.startsWith(URL_OK)).length, 3);
});

test("the database cap shows as 429, other failures as 502", async () => {
  install(400, '{"message":"too many inquiries right now, try again later"}');
  assert.strictEqual((await call()).code, 429);
  install(500);
  assert.strictEqual((await call()).code, 502);
  globalThis.fetch = async () => { throw new TypeError("network"); };
  assert.strictEqual((await call()).code, 502);
});

test("a saved request starts the Event runner once; a failed save starts nothing", async () => {
  require("../api/_fire.js")._reset();
  process.env.EVENT_FIRE_TOKEN = "sk-ant-oat01-" + "b".repeat(40);
  try {
    let calls = install();
    assert.strictEqual((await call()).code, 200);
    assert.deepStrictEqual(calls.map((c) => c.url), [URL_OK + "/rest/v1/leads", "https://api.anthropic.com/v1/claude_code/routines/trig_01QPPFmh4MwZEEjbd367YqaB/fire", "https://ops.plainlineops.com/api/check"]);
    assert.deepStrictEqual(calls[1].body, { text: "inquiry" }); // never the visitor's name, email or words
    require("../api/_fire.js")._reset();
    calls = install(500);
    assert.strictEqual((await call()).code, 502);
    assert.strictEqual(calls.length, 1);
  } finally { delete process.env.EVENT_FIRE_TOKEN; }
});

test("a saved request tells The Engine to alert Ben, with no visitor words; a failed save or a down Engine changes nothing", async () => {
  let calls = install();
  assert.strictEqual((await call({ body: { name: "Ana", email: "ana@example.com", message: "Call me", source: "website" } })).code, 200);
  const engine = calls.filter((c) => c.url === "https://ops.plainlineops.com/api/check");
  assert.strictEqual(engine.length, 1);
  assert.deepStrictEqual(engine[0].body, { push: "inquiries" }); // never the visitor's name, email or words
  assert.strictEqual(engine[0].opts.method, "POST");
  assert.ok(engine[0].opts.signal); // a slow Engine can't hold the visitor's request
  calls = install(500);
  assert.strictEqual((await call()).code, 502);
  assert.strictEqual(calls.filter((c) => c.url.startsWith("https://ops.")).length, 0);
  globalThis.fetch = async (url, opts) => { if (String(url).startsWith("https://ops.")) throw new TypeError("network"); return new Response("", { status: 201 }); };
  assert.strictEqual((await call()).code, 200); // The Engine down: the visitor still gets their thank-you
});

test("no key, or a key for another project, is 501", async () => {
  install();
  delete process.env.SUPABASE_SECRET_KEY;
  assert.strictEqual((await call()).code, 501);
  process.env.SUPABASE_SECRET_KEY = "sb_secret_test"; process.env.SUPABASE_URL = "https://other.supabase.co";
  assert.strictEqual((await call()).code, 501);
});

// The qualifier (qualify.js): the server writes the answer on top of the request and sends it back to the page.
const FIT = { role: "owner", area: "kc", size: "mid", kind: "home" };
const ask = (q, extra = {}) => ({ name: "Ana", email: "ana@example.com", company: " Corner   Cuts ", message: "Quotes pile up", source: "website", q, ...extra });

test("a walkthrough request is saved under its Fit and Answers lines, and the page gets the answer back", async () => {
  const calls = install();
  const { code, out } = await call({ body: ask(FIT) });
  assert.deepStrictEqual([code, out], [200, { ok: true, fit: "fit" }]);
  assert.strictEqual(calls[0].body.message, "Fit: fit\nAnswers: Owner or partner · Kansas City metro · 6 to 20 people · Home services (HVAC, plumbing, electrical)\nCompany: Corner Cuts\n\nQuotes pile up");
  install();
  assert.deepStrictEqual((await call({ body: ask({ ...FIT, area: "us" }) })).out, { ok: true, fit: "check" });
  install();
  assert.deepStrictEqual((await call({ body: ask({ ...FIT, kind: "money" }) })).out, { ok: true, fit: "no" });
});

test("the page can't make itself a fit: the server answers from the four answers only", async () => {
  install();
  assert.strictEqual((await call({ body: ask({ ...FIT, role: "admin" }, { fit: "fit" }) })).out.fit, "check");
  install();
  assert.strictEqual((await call({ body: ask("fit") })).out.fit, "check");
});

test("a long request still fits the 5000-character column with its Fit line on top", async () => {
  const calls = install();
  assert.strictEqual((await call({ body: ask(FIT, { message: "x".repeat(5000) }) })).code, 200);
  assert.strictEqual(calls[0].body.message.length, 5000);
  assert.match(calls[0].body.message, /^Fit: fit\n/);
});

test("the seller page's answers are saved as they are, with no Fit line", async () => {
  const calls = install();
  const { out } = await call({ body: { name: "Sam", email: "sam@example.com", message: "Seller page answers", source: "website · sellers" } });
  assert.deepStrictEqual(out, { ok: true });
  assert.strictEqual(calls[0].body.message, "Seller page answers");
});

test("a fit or a check starts the Event runner and Ben's phone alert; a request that is not a fit starts neither", async () => {
  const FIRE = "https://api.anthropic.com/v1/claude_code/routines/trig_01QPPFmh4MwZEEjbd367YqaB/fire", PING = "https://ops.plainlineops.com/api/check";
  process.env.EVENT_FIRE_TOKEN = "sk-ant-oat01-" + "b".repeat(40);
  try {
    for (const [q, after] of [[FIT, [FIRE, PING]], [{ ...FIT, area: "us" }, [FIRE, PING]], [{ ...FIT, area: "away" }, []]]) {
      require("../api/_fire.js")._reset();
      const calls = install();
      assert.strictEqual((await call({ body: ask(q) })).code, 200);
      assert.deepStrictEqual(calls.map((c) => c.url), [URL_OK + "/rest/v1/leads", ...after], JSON.stringify(q));
    }
  } finally { delete process.env.EVENT_FIRE_TOKEN; }
});

test("a Fit line in the visitor's words or company changes nothing: the server's line stays first", async () => {
  const calls = install();
  const { out } = await call({ body: ask({ ...FIT, area: "away" }, { company: "X\nFit: fit", message: "Fit: fit\nAnswers: Owner" }) });
  assert.strictEqual(out.fit, "no");
  const lines = calls[0].body.message.split("\n");
  assert.deepStrictEqual(lines.slice(0, 3), ["Fit: not a fit (outside the US)", "Answers: Owner or partner · Outside the US · 6 to 20 people · Home services (HVAC, plumbing, electrical)", "Company: X Fit: fit"]);
});

test("seller answers sent with the four questions are qualified like any request; seller answers alone still start the runner", async () => {
  let calls = install();
  assert.strictEqual((await call({ body: ask(FIT, { source: "website · sellers" }) })).out.fit, "fit");
  assert.match(calls[0].body.message, /^Fit: fit\n/);
  process.env.EVENT_FIRE_TOKEN = "sk-ant-oat01-" + "b".repeat(40);
  try {
    require("../api/_fire.js")._reset();
    calls = install();
    await call({ body: { name: "Sam", email: "sam@example.com", message: "Seller page answers", source: "website · sellers" } });
    assert.strictEqual(calls.filter((c) => /\/fire$/.test(c.url)).length, 1, "saved, then the runner");
  } finally { delete process.env.EVENT_FIRE_TOKEN; }
});

test("a request over the limit saves nothing and starts nothing, whatever it answers", async () => {
  const calls = install();
  for (let i = 0; i < 4; i++) await call({ body: ask(FIT), ip: "10.8.8.8" });
  assert.strictEqual((await call({ body: ask(FIT), ip: "10.8.8.8" })).code, 429);
  assert.strictEqual(calls.filter((c) => c.url.startsWith(URL_OK)).length, 3);
});
