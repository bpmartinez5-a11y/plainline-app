// Run: node --test tests/*.test.js
// api/_fire.js: the Event runner starts only with a real token and a known kind, sends the kind word and nothing else,
// fires at most once every 2 minutes and 6 times a day per server copy, and a failure never throws.
const test = require("node:test");
const assert = require("node:assert");
const { fireEvent, _reset } = require("../api/_fire.js");

const realFetch = globalThis.fetch, realError = console.error;
const TOKEN = "sk-ant-oat01-" + "a".repeat(40);
const T0 = Date.parse("2026-11-11T15:00:00Z"), MIN = 60 * 1000;
function install(status = 200) {
  const calls = [];
  globalThis.fetch = async (url, opts) => { calls.push({ url, opts }); return new Response("{}", { status }); };
  return calls;
}
test.beforeEach(() => { _reset(); process.env.EVENT_FIRE_TOKEN = TOKEN; console.error = () => {}; });
test.afterEach(() => { globalThis.fetch = realFetch; console.error = realError; delete process.env.EVENT_FIRE_TOKEN; });

test("off without a real token or for an unknown kind", async () => {
  const calls = install();
  delete process.env.EVENT_FIRE_TOKEN;
  assert.strictEqual(await fireEvent("inquiry", T0), "off");
  process.env.EVENT_FIRE_TOKEN = "paste-here";
  assert.strictEqual(await fireEvent("inquiry", T0), "off");
  process.env.EVENT_FIRE_TOKEN = TOKEN;
  assert.strictEqual(await fireEvent("payment", T0), "off");
  assert.strictEqual(calls.length, 0);
});

test("fires the Event runner with the kind word only", async () => {
  const calls = install();
  process.env.EVENT_FIRE_TOKEN = " " + TOKEN + "\n"; // a pasted token with spaces still works
  assert.strictEqual(await fireEvent("inquiry", T0), "fired");
  assert.strictEqual(calls[0].url, "https://api.anthropic.com/v1/claude_code/routines/trig_01QPPFmh4MwZEEjbd367YqaB/fire");
  assert.strictEqual(calls[0].opts.method, "POST");
  assert.strictEqual(calls[0].opts.body, '{"text":"inquiry"}');
  assert.strictEqual(calls[0].opts.headers.authorization, "Bearer " + TOKEN);
  assert.strictEqual(calls[0].opts.headers["anthropic-beta"], "experimental-cc-routine-2026-04-01");
  assert.ok(calls[0].opts.signal, "has a timeout");
});

test("one fire per 2 minutes and 6 a day; the count starts again the next day", async () => {
  const calls = install();
  const got = [];
  for (const m of [0, 1, 2, 4, 6, 8, 10, 12]) got.push(await fireEvent("inquiry", T0 + m * MIN));
  assert.deepStrictEqual(got, ["fired", "capped", "fired", "fired", "fired", "fired", "fired", "capped"]);
  assert.strictEqual(calls.length, 6);
  assert.strictEqual(await fireEvent("inquiry", T0 + 24 * 60 * MIN), "fired");
});

test("a refused or failed call returns failed and never throws", async () => {
  install(401);
  assert.strictEqual(await fireEvent("inquiry", T0), "failed");
  globalThis.fetch = async () => { throw new TypeError("network"); };
  assert.strictEqual(await fireEvent("inquiry", T0 + 3 * MIN), "failed");
});
