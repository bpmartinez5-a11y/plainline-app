// Run: node --test tests/*.test.js
// The profile endpoint against a fake Claude: it must return a sanitized profile and never pass bad URLs through.
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");

function fakeClaude(input, stop = "tool_use") {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let b = ""; req.on("data", c => b += c); req.on("end", () => {
        srv.lastBody = JSON.parse(b);
        res.writeHead(200, { "content-type": "text/event-stream" });
        const j = JSON.stringify(input), ev = o => res.write("data: " + JSON.stringify(o) + "\n\n");
        for (let i = 0; i < j.length; i += 50) ev({ type: "content_block_delta", index: 0, delta: { type: "input_json_delta", partial_json: j.slice(i, i + 50) } });
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

test("returns a sanitized profile from Claude's tool call", async () => {
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
  assert.strictEqual(srv.lastBody.tool_choice.name, "save_profile");
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
