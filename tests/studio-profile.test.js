// Run: node --test tests/*.test.js
// The profile endpoint against a fake Claude: it must return a sanitized profile and never pass bad URLs through.
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

function fakeClaude(input, stop = "end_turn", status = 200, error = null) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let b = ""; req.on("data", c => b += c); req.on("end", () => {
        srv.lastBody = JSON.parse(b);
        if (status !== 200) { res.writeHead(status, { "content-type": "application/json" }); return res.end(JSON.stringify({ type: "error", error })); }
        res.writeHead(200, { "content-type": "text/event-stream" });
        const j = input === null ? "" : JSON.stringify(input), ev = o => res.write("data: " + JSON.stringify(o) + "\n\n");
        // The model thinks first (the parser must skip that), then writes the profile as JSON text (structured outputs).
        ev({ type: "content_block_start", index: 0, content_block: { type: "thinking", thinking: "" } });
        ev({ type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "Plan the profile {\"business\":" } });
        if (j) ev({ type: "content_block_start", index: 1, content_block: { type: "text", text: "" } });
        for (let i = 0; i < j.length; i += 50) ev({ type: "content_block_delta", index: 1, delta: { type: "text_delta", text: j.slice(i, i + 50) } });
        ev({ type: "message_delta", delta: { stop_reason: stop } }); res.end();
      });
    }).listen(0, () => resolve(srv));
  });
}
function call(handler, body, key = "k") {
  return new Promise(resolve => {
    let out = "", code = 200;
    const res = { status(c) { code = c; return this; }, setHeader() {}, json(o) { out = JSON.stringify(o); resolve({ code, out }); }, write(c) { out += c; }, end() { resolve({ code, out }); } };
    handler({ method: "POST", headers: { "x-studio-key": key }, body: JSON.stringify(body) }, res);
  });
}
const scan = { domain: "example.com", site: { url: "https://example.com/", title: "Example", images: [], text: "We fix pipes." }, pages: [] };

test("returns a sanitized profile from Claude's structured output", async () => {
  const srv = await fakeClaude({ business: { name: "Pipe Pros", domain: "evil.example", socials: [{ label: "X", url: "javascript:alert(1)" }, { label: "Y", url: "https://phish.example/login" }] }, look: "grid", voice: "clean", hero: { lines: ["Pipes fixed"], photos: ["ftp://nope/x.jpg"] }, collections: [{ title: "Services", items: [{ title: "Drains" }] }], booking: { types: [{ label: "Repair" }] }, owner: { jobWord: "job" } });
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_API_KEY = "x"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { code, out } = await call(require("../api/studio-profile.js"), { scan });
  srv.close();
  assert.strictEqual(code, 200);
  const { profile } = JSON.parse(out.trim().split("\n").pop());
  assert.strictEqual(profile.business.name, "Pipe Pros");
  assert.strictEqual(profile.business.domain, "example.com");
  assert.deepStrictEqual(profile.business.socials, []);
  assert.deepStrictEqual(profile.hero.photos, []);
  // Sonnet 5.5 answers a forced tool_choice with a 400, so the profile comes back as structured output (as in The Engine's deck).
  assert.strictEqual(srv.lastBody.tools, undefined);
  assert.strictEqual(srv.lastBody.tool_choice, undefined);
  assert.strictEqual(srv.lastBody.output_config.format.type, "json_schema");
  assert.match(srv.lastBody.system, /response format sets/);
});

test("the response schema closes every object and requires every field (structured outputs rules)", () => {
  process.env.ANTHROPIC_API_KEY = "x";
  const { SCHEMA } = require("../api/studio-profile.js");
  let objects = 0;
  const walk = v => {
    if (!v || typeof v !== "object") return;
    if (v.type === "object") {
      objects++;
      assert.strictEqual(v.additionalProperties, false);
      assert.deepStrictEqual(v.required, Object.keys(v.properties));
    }
    Object.values(v).forEach(walk);
  };
  walk(SCHEMA);
  assert.ok(objects > 20, "walked " + objects);
  assert.deepStrictEqual(SCHEMA.properties.look.enum, ["studio", "grid", "backstage"]);
});

test("an answer with every field empty still renders a site", async () => {
  const { SCHEMA } = require("../api/studio-profile.js");
  const empty = s => s.type === "object" ? Object.fromEntries(Object.entries(s.properties).map(([k, x]) => [k, empty(x)]))
    : s.type === "array" ? [empty(s.items)] : s.type === "boolean" ? false : s.enum ? s.enum[0] : ""; // lists hold one all-empty item
  const srv = await fakeClaude(empty(SCHEMA));
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { out } = await call(require("../api/studio-profile.js"), { scan });
  srv.close();
  const { profile } = JSON.parse(out.trim().split("\n").pop());
  assert.strictEqual(profile.about.photo, null);
  assert.deepStrictEqual(profile.hero.photos, []);
  const Engine = require("../studio-engine.js");
  assert.match(Engine.render(profile).site, /<html/i);
});

test("an error mid-stream gives the safe type, never the message text", async () => {
  const srv = http.createServer((req, res) => { req.resume(); req.on("end", () => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    res.end("data: " + JSON.stringify({ type: "error", error: { type: "overloaded_error", message: "Customer wrote: call me at 555-0100" } }) + "\n\n");
  }); }).listen(0);
  await new Promise(r => srv.on("listening", r));
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  try { await assert.rejects(require("../api/studio-profile.js").plan({ scan }), e => e.upstream && e.message === "Claude stopped mid-answer (overloaded_error)"); }
  finally { srv.close(); }
});

test("a 400 names the reason without the request text", async () => {
  const srv = await fakeClaude(null, "", 400, { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." });
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const logged = [], orig = console.error; console.error = (...a) => logged.push(a.join(" "));
  try { await assert.rejects(require("../api/studio-profile.js").plan({ scan }), e => e.upstream && e.message === "Claude said 400: credit balance too low"); }
  finally { console.error = orig; srv.close(); }
  assert.deepStrictEqual(logged, ["anthropic 400 invalid_request_error credit balance too low (with the response schema)"]); // an account problem: no retry
});

// A fake Claude that answers each request with the next reply in the list: {status, error} or {text} (streamed as text deltas).
function fakeSeq(list) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let b = ""; req.on("data", c => b += c); req.on("end", () => {
        srv.bodies.push(JSON.parse(b));
        const next = list[srv.bodies.length - 1] || list[list.length - 1];
        if (next.status) { res.writeHead(next.status, { "content-type": "application/json" }); return res.end(JSON.stringify({ type: "error", error: next.error })); }
        res.writeHead(200, { "content-type": "text/event-stream" });
        const ev = o => res.write("data: " + JSON.stringify(o) + "\n\n");
        ev({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: next.text } });
        ev({ type: "message_delta", delta: { stop_reason: "end_turn" } }); res.end();
      });
    }).listen(0, () => resolve(srv));
    return srv;
  }).then(srv => { srv.bodies = []; return srv; });
}
const unknown400 = { status: 400, error: { type: "invalid_request_error", message: "Customer wrote: call me at 555-0100" } };

test("a 400 with the response schema asks once more for plain JSON, and that answer still goes through the rules", async () => {
  const answer = { business: { name: "Plain Pipes", tagline: "Write to owner@example.com" }, look: "grid", voice: "clean", hero: { lines: ["Pipes"], photos: [{ src: "https://stock.example/fake.jpg", alt: "" }] } };
  const srv = await fakeSeq([unknown400, { text: "Here it is:\n```json\n" + JSON.stringify(answer) + "\n```" }]);
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const logged = [], orig = console.error; console.error = (...a) => logged.push(a.join(" "));
  let res;
  try { res = await call(require("../api/studio-profile.js"), { scan }); } finally { console.error = orig; srv.close(); }
  assert.strictEqual(res.code, 200);
  const { profile } = JSON.parse(res.out.trim().split("\n").pop());
  assert.strictEqual(profile.business.name, "Plain Pipes");
  assert.deepStrictEqual(profile.hero.photos, []); // enforce() still drops photos that were not on their site
  assert.ok(!JSON.stringify(profile).includes("owner@example.com"));
  const [first, second] = srv.bodies;
  assert.strictEqual(srv.bodies.length, 2);
  assert.strictEqual(first.output_config.format.type, "json_schema");
  assert.deepStrictEqual(second.output_config, { effort: "low" });
  assert.match(second.system, /A program reads your answer/);
  assert.ok(second.system.includes(JSON.stringify(require("../api/studio-profile.js").SCHEMA)));
  assert.strictEqual(second.messages[0].content, first.messages[0].content);
  assert.ok(!logged.join("\n").includes("555-0100"), logged.join("\n")); // the API's message text never reaches the log
  assert.deepStrictEqual(logged, ["anthropic 400 invalid_request_error  (with the response schema)",
    "studio-profile: 400 with the response schema; asking again for plain JSON", "studio-profile: the plain JSON request answered"]);
});

test("when the plain JSON request fails too, the caller gets a plain 502 and only one retry was made", async () => {
  const srv = await fakeSeq([unknown400, unknown400, { text: "{}" }]);
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const orig = console.error; console.error = () => {};
  let res;
  try { res = await call(require("../api/studio-profile.js"), { scan }); } finally { console.error = orig; srv.close(); }
  assert.strictEqual(res.code, 502);
  assert.strictEqual(JSON.parse(res.out).error, "Claude said 400");
  assert.strictEqual(srv.bodies.length, 2);
});

test("a plain answer with no JSON object comes back as a plain error", async () => {
  const srv = await fakeSeq([unknown400, { text: "Sorry, I can't." }]);
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const orig = console.error; console.error = () => {};
  try { await assert.rejects(require("../api/studio-profile.js").plan({ scan }), /didn't return a usable profile/); }
  finally { console.error = orig; srv.close(); }
});

test("an answer with no tool call comes back as a plain error", async () => {
  const srv = await fakeClaude(null, "end_turn");
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { out } = await call(require("../api/studio-profile.js"), { scan });
  srv.close();
  assert.match(JSON.parse(out.trim().split("\n").pop()).error, /without a profile \(end_turn\)/);
  assert.match(srv.lastBody.messages[0].content, /We fix pipes/);
});

test("a cut-off answer comes back as an error, not a half profile", async () => {
  const srv = await fakeClaude({ business: { name: "Cut" } }, "max_tokens");
  process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { out } = await call(require("../api/studio-profile.js"), { scan });
  srv.close();
  assert.match(JSON.parse(out.trim().split("\n").pop()).error, /cut off/);
});

test("refuses without the Studio key or a scan", async () => {
  process.env.STUDIO_KEY = "k";
  const h = require("../api/studio-profile.js");
  assert.strictEqual((await call(h, { scan }, "wrong")).code, 401);
  assert.strictEqual((await call(h, {})).code, 400);
});

test("photos not on their site and email addresses are dropped", async () => {
  const scan2 = { domain: "example.com", site: { url: "https://example.com/", images: [{ src: "https://example.com/real.jpg", alt: "" }], text: "" }, pages: [] };
  const srv = await fakeClaude({ business: { name: "Pipe Pros", tagline: "Email us at owner@example.com today" }, look: "grid", voice: "clean",
    hero: { lines: ["Pipes"], photos: ["https://example.com/real.jpg", "https://stock.example/fake.jpg"] }, collections: [{ title: "Services", items: [{ title: "Drains", photos: ["https://stock.example/fake2.jpg"] }] }], booking: {}, owner: {} });
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { out } = await call(require("../api/studio-profile.js"), { scan: scan2 });
  srv.close();
  const { profile } = JSON.parse(out.trim().split("\n").pop());
  assert.deepStrictEqual(profile.hero.photos.map(p => p.src), ["https://example.com/real.jpg"]);
  assert.deepStrictEqual(profile.collections[0].items[0].photos, []);
  assert.ok(!JSON.stringify(profile).includes("owner@example.com"));
  assert.ok(profile.todos.some(t => /privacy page/.test(t)));
});

test("Ben's answers reach Claude and questions come back", async () => {
  const srv = await fakeClaude({ business: { name: "Q Co" }, look: "grid", voice: "clean", hero: {}, collections: [], booking: {}, owner: {}, questions: [{ question: "Show prices?", options: ["Yes", "No"] }] });
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const { out } = await call(require("../api/studio-profile.js"), { scan, answers: [{ question: "Lead service?", answer: "Water heaters" }] });
  srv.close();
  assert.match(srv.lastBody.messages[0].content, /Lead service\? → Water heaters/);
  assert.strictEqual(JSON.parse(out.trim().split("\n").pop()).profile.questions[0].question, "Show prices?");
});

test("blank answers are dropped and up to 8 answers are kept", async () => {
  const srv = await fakeClaude({ business: { name: "Q" }, look: "grid", voice: "clean", hero: {}, collections: [], booking: {}, owner: {} });
  process.env.STUDIO_KEY = "k"; process.env.ANTHROPIC_BASE_URL = "http://127.0.0.1:" + srv.address().port;
  delete require.cache[require.resolve("../api/studio-profile.js")];
  const answers = Array.from({ length: 9 }, (_, i) => ({ question: "Q" + i + "?", answer: i === 1 ? "  " : "A" + i }));
  await call(require("../api/studio-profile.js"), { scan, answers });
  srv.close();
  const brief = srv.lastBody.messages[0].content;
  assert.ok(!brief.includes("Q1?")); assert.ok(brief.includes("Q7? → A7")); assert.ok(!brief.includes("Q8?"));
});
