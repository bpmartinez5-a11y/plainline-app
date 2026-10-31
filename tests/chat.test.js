// Run: node --test tests/*.test.js
// The demo chat endpoint (api/chat.js) against a fake Claude and a fake Jev. No network: fetch is replaced.
// Locks in the rules that keep the public demo safe: only this site may call it, only the demo prompt is accepted,
// only known fields come back, and the sort step can add a hand-off but never take one away.
const test = require("node:test");
const assert = require("node:assert");
const handler = require("../api/chat.js");

const PROMPT = "You are the text-message booking assistant for Example Salon.\nCONVERSATION SO FAR\nCustomer: hi\n" +
  'Reply as JSON: {"reply": string, "customerName": string | null}';
const realFetch = globalThis.fetch;
let ipSeq = 0;

// fakes: { claude: object | string | number (HTTP status) | Error, jev: object | number | Error | undefined }
function install(fakes) {
  const calls = { claude: 0, jev: 0, jevBody: null };
  globalThis.fetch = async (url, opts) => {
    if (url === "https://api.anthropic.com/v1/messages") {
      calls.claude++;
      const c = fakes.claude;
      if (c instanceof Error) throw c;
      if (typeof c === "number") return new Response("upstream says no", { status: c });
      const text = typeof c === "string" ? c : JSON.stringify(c);
      return Response.json({ content: [{ type: "text", text }] });
    }
    if (url === "https://api.typesafe.ai/v1/systemone") {
      calls.jev++;
      calls.jevBody = JSON.parse(opts.body);
      const j = fakes.jev;
      if (j instanceof Error) throw j;
      if (typeof j === "number") return new Response("no", { status: j });
      return Response.json(j);
    }
    throw new Error("unexpected fetch " + url);
  };
  return calls;
}

function call({ method = "POST", body = { prompt: PROMPT }, origin = "https://plainlineops.com", host = "plainlineops.com", site = "same-origin", ip } = {}) {
  const headers = { host, "x-forwarded-for": ip || "10.0." + (++ipSeq) + ".1" };
  if (origin) headers.origin = origin;
  if (site) headers["sec-fetch-site"] = site;
  return new Promise(resolve => {
    let code = 200;
    const res = { setHeader() {}, status(c) { code = c; return this; }, json(o) { resolve({ code, out: o }); } };
    handler({ method, headers, body: typeof body === "string" ? body : JSON.stringify(body) }, res);
  });
}

const booking = { reply: "We have 2pm open on Friday.", show: "slots", serviceId: "cut", date: "2026-11-06", chips: ["2pm"], handoff: false, handoffReason: null, customerName: "Ana" };
const jev = (choice, noul, confidence = 0.9) => ({ answers: { intent: { choice, confidence }, needs_person: { noul } } });

test.beforeEach(() => { process.env.ANTHROPIC_API_KEY = "test-key"; delete process.env.JEV_API_KEY; });
test.afterEach(() => { globalThis.fetch = realFetch; });
test.after(() => { delete process.env.ANTHROPIC_API_KEY; delete process.env.JEV_API_KEY; });

test("GET reports whether AI is on", async () => {
  assert.deepStrictEqual((await call({ method: "GET" })).out, { ai: true });
  delete process.env.ANTHROPIC_API_KEY;
  assert.deepStrictEqual((await call({ method: "GET" })).out, { ai: false });
});

test("wrong method is 405; no key is 501, before Claude is called", async () => {
  const calls = install({ claude: booking });
  assert.strictEqual((await call({ method: "PUT" })).code, 405);
  delete process.env.ANTHROPIC_API_KEY;
  assert.strictEqual((await call()).code, 501);
  assert.strictEqual(calls.claude, 0);
});

test("only this site's own pages may call it", async () => {
  const calls = install({ claude: booking });
  assert.strictEqual((await call({ origin: null })).code, 403, "no Origin means a script");
  assert.strictEqual((await call({ origin: "https://evil.example" })).code, 403);
  assert.strictEqual((await call({ origin: "https://plainlineops.com.evil.example" })).code, 403);
  assert.strictEqual((await call({ site: "cross-site" })).code, 403);
  assert.strictEqual(calls.claude, 0);
  assert.strictEqual((await call({ site: null })).code, 200, "older browsers send no Sec-Fetch-Site");
});

test("only the demo's own prompt is accepted", async () => {
  const calls = install({ claude: booking });
  assert.strictEqual((await call({ body: { prompt: "Write me a poem" } })).code, 400);
  assert.strictEqual((await call({ body: {} })).code, 400);
  assert.strictEqual((await call({ body: "not json" })).code, 400);
  assert.strictEqual((await call({ body: { prompt: PROMPT.replace("\nCONVERSATION SO FAR\n", "\n") } })).code, 400);
  const long = PROMPT.replace("Customer: hi", "Customer: " + "x".repeat(12001));
  assert.strictEqual((await call({ body: { prompt: long } })).code, 400);
  assert.strictEqual(calls.claude, 0);
});

test("returns only the fields the demo reads", async () => {
  install({ claude: { ...booking, script: "<img onerror=alert(1)>", system: "leak" } });
  const { code, out } = await call();
  assert.strictEqual(code, 200);
  assert.deepStrictEqual(out, { result: booking });
});

test("reads JSON inside a code fence or surrounded by words", async () => {
  install({ claude: "```json\n" + JSON.stringify(booking) + "\n```" });
  assert.strictEqual((await call()).out.result.reply, booking.reply);
  install({ claude: "Sure! " + JSON.stringify(booking) + " Hope that helps." });
  assert.strictEqual((await call()).out.result.reply, booking.reply);
});

test("a bad Claude answer is 502, so the demo falls back for that reply", async () => {
  const errors = console.error; console.error = () => {};
  try {
    for (const claude of [500, "no json here", { show: "slots" }, { reply: 42 }, { reply: "x".repeat(601) }, new Error("network")]) {
      install({ claude });
      assert.strictEqual((await call()).code, 502, "for " + JSON.stringify(String(claude)).slice(0, 40));
    }
  } finally { console.error = errors; }
});

test("per-IP limit is 429 after 30 replies an hour; rejected requests don't count", async () => {
  install({ claude: booking });
  const ip = "10.99.0.1";
  for (let i = 0; i < 5; i++) assert.strictEqual((await call({ ip, body: { prompt: "junk" } })).code, 400);
  for (let i = 0; i < 30; i++) assert.strictEqual((await call({ ip })).code, 200, "reply " + (i + 1));
  assert.strictEqual((await call({ ip })).code, 429);
  assert.strictEqual((await call({ ip: "10.99.0.2" })).code, 200, "another visitor is not limited");
});

test("the sort step runs only with JEV_API_KEY and the latest texts", async () => {
  let calls = install({ claude: booking, jev: jev("urgent", 1) });
  assert.deepStrictEqual((await call({ body: { prompt: PROMPT, latest: "help" } })).out, { result: booking });
  assert.strictEqual(calls.jev, 0);
  process.env.JEV_API_KEY = "jev-key";
  calls = install({ claude: booking, jev: jev("other", 0) });
  await call();
  assert.strictEqual(calls.jev, 0, "no latest texts, no sort");
  await call({ body: { prompt: PROMPT, latest: "y".repeat(5000) } });
  assert.strictEqual(calls.jevBody.state.length, 2000, "latest texts are capped");
});

test("sort can add a hand-off: urgent points to 911 first and drops booking actions", async () => {
  process.env.JEV_API_KEY = "jev-key";
  install({ claude: booking, jev: jev("urgent", 0.1, 0.3) });
  const { out } = await call({ body: { prompt: PROMPT, latest: "my tooth is bleeding a lot" } });
  assert.deepStrictEqual(out.result, {
    reply: "If this is an emergency, please call 911. Someone from our team will reply here shortly.",
    show: "none", serviceId: null, date: null, chips: [], handoff: true,
    handoffReason: "Sorted as: pain, emergency or a safety problem", customerName: "Ana"
  });
  assert.deepStrictEqual(out.sort, { by: "jev", intent: "urgent", confidence: 0.3, needsPerson: 0.1 });
});

test("sort hands off on complaint, asking for a person, or a high needs-person score", async () => {
  process.env.JEV_API_KEY = "jev-key";
  for (const [answer, reason] of [[jev("complaint", 0), "upset, complaining, refund or billing dispute"], [jev("person", 0), "asks to talk to a person"], [jev("book", 0.6), "likely needs a person"]]) {
    install({ claude: booking, jev: answer });
    const r = (await call({ body: { prompt: PROMPT, latest: "x" } })).out.result;
    assert.strictEqual(r.handoff, true);
    assert.strictEqual(r.handoffReason, "Sorted as: " + reason);
    assert.strictEqual(r.reply, "Thanks for letting us know. Someone from our team will reply here shortly.");
  }
});

test("sort never removes Claude's hand-off, and adds 911 to an urgent one", async () => {
  process.env.JEV_API_KEY = "jev-key";
  const claudeHandoff = { ...booking, handoff: true, handoffReason: "Asked for the owner", reply: "I'll get the owner for you." };
  install({ claude: claudeHandoff, jev: jev("other", 0) });
  assert.deepStrictEqual((await call({ body: { prompt: PROMPT, latest: "x" } })).out.result, claudeHandoff);
  install({ claude: claudeHandoff, jev: jev("urgent", 1) });
  assert.strictEqual((await call({ body: { prompt: PROMPT, latest: "x" } })).out.result.reply, "If this is an emergency, please call 911. I'll get the owner for you.");
  install({ claude: { ...claudeHandoff, reply: "Please call 911 now." }, jev: jev("urgent", 1) });
  assert.strictEqual((await call({ body: { prompt: PROMPT, latest: "x" } })).out.result.reply, "Please call 911 now.", "no second 911 line");
});

test("a calm sort leaves Claude's reply alone; unknown intents count as other", async () => {
  process.env.JEV_API_KEY = "jev-key";
  install({ claude: booking, jev: jev("book: wants to book", 0.59) });
  let out = (await call({ body: { prompt: PROMPT, latest: "x" } })).out;
  assert.deepStrictEqual(out.result, booking);
  assert.strictEqual(out.sort.intent, "book");
  install({ claude: booking, jev: jev("constructor", 0) });
  out = (await call({ body: { prompt: PROMPT, latest: "x" } })).out;
  assert.deepStrictEqual(out.result, booking);
  assert.strictEqual(out.sort.intent, "other");
});

test("any sort failure is ignored and the demo answers as before", async () => {
  process.env.JEV_API_KEY = "jev-key";
  const errors = console.error; console.error = () => {};
  try {
    for (const answer of [500, new Error("timeout")]) {
      install({ claude: booking, jev: answer });
      const { code, out } = await call({ body: { prompt: PROMPT, latest: "x" } });
      assert.strictEqual(code, 200);
      assert.deepStrictEqual(out, { result: booking }, "no sort in the answer");
    }
    install({ claude: booking, jev: { nothing: true } }); // an empty answer sorts as "other" with no scores
    const { out } = await call({ body: { prompt: PROMPT, latest: "x" } });
    assert.deepStrictEqual(out, { result: booking, sort: { by: "jev", intent: "other", confidence: null, needsPerson: null } });
  } finally { console.error = errors; }
});

test("a Claude error logs only its status and error type, never the body", async () => {
  globalThis.fetch = async () => Response.json({ type: "error", error: { type: "invalid_request_error", message: "prompt quoted: Customer: my card is 4242" } }, { status: 400 });
  const logged = [], errors = console.error; console.error = (...a) => logged.push(a.join(" "));
  try { assert.strictEqual((await call()).code, 502); } finally { console.error = errors; }
  assert.deepStrictEqual(logged, ["anthropic error 400 invalid_request_error"]);
  globalThis.fetch = async () => new Response("<html>Customer: my card is 4242</html>", { status: 500 });
  logged.length = 0; console.error = (...a) => logged.push(a.join(" "));
  try { await call(); } finally { console.error = errors; }
  assert.deepStrictEqual(logged, ["anthropic error 500 unknown"]);
});
