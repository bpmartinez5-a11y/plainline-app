// Run: node --test tests/
const test = require("node:test");
const assert = require("node:assert");
const E = require("../studio-engine.js");
const photographer = require("../studio-examples/photographer-sample.json");
const ridgeline = require("../studio-examples/ridgeline-sample.json");

test("renders both pages for each example", () => {
  for (const p of [photographer, ridgeline]) {
    const out = E.render(p, { preview: true });
    assert.match(out.site, /^<!doctype html>/);
    assert.match(out.dashboard, /^<!doctype html>/);
    assert.ok(out.site.includes(JSON.stringify(p.business.name).slice(1, -1)));
  }
});

test("scraped text can't break out of the embedded profile", () => {
  const out = E.render({ business: { name: "</script><script>alert(1)</script>" }, hero: { lede: "<img src=x onerror=alert(1)>" } });
  const scripts = out.site.match(/<script[\s>]/gi).length;
  const closes = out.site.match(/<\/script>/gi).length;
  assert.strictEqual(scripts, closes, "every <script> has exactly one close");
  assert.ok(!out.site.includes("</script><script>alert"), "profile text is escaped inside the script");
  assert.ok(out.site.includes("\\u003c/script\\u003e"));
});

test("only http(s) links and photos survive", () => {
  const p = E.sanitize({
    business: { name: "X", socials: [{ label: "A", url: "javascript:alert(1)" }, { label: "B", url: "https://instagram.com/x" }] },
    hero: { photos: ["data:text/html,hi", "https://cdn.example.com/a.jpg", { src: "//evil.example/x.jpg" }] }
  });
  assert.deepStrictEqual(p.business.socials.map(s => s.label), ["B"]);
  assert.deepStrictEqual(p.hero.photos.map(x => x.src), ["https://cdn.example.com/a.jpg"]);
});

test("collection ids are slugs, unique, and never shadow a page", () => {
  const p = E.sanitize({ collections: [
    { title: "About", items: [{ title: "One" }, { title: "One" }] },
    { title: "Pricing & Plans", items: [{ title: "Two!" }] }
  ] });
  assert.deepStrictEqual(p.collections.map(c => c.id), ["about-work", "pricing-and-plans"]);
  assert.deepStrictEqual(p.collections[0].items.map(i => i.id), ["one", "one-2"]);
});

test("unknown look, voice and accent fall back safely", () => {
  const p = E.sanitize({ look: "vaporwave", voice: "comic", accent: "red;}body{display:none" });
  assert.strictEqual(p.look, "studio");
  assert.strictEqual(p.voice, "bold");
  assert.match(p.accent, /^#[0-9A-F]{6}$/);
});

test("a pale accent is darkened until it reads on a light page", () => {
  const p = E.sanitize({ look: "studio", accent: "#FFF6CC" });
  assert.notStrictEqual(p._tokens.accentLight, "#FFF6CC");
});

test("missing facts are counted as placeholders, never invented", () => {
  const out = E.render(ridgeline);
  assert.ok(out.todos >= 2);
  const empty = E.render({});
  assert.strictEqual(empty.profile.business.name, "ADD: business name");
});

test("a live build hides the owner link; a preview shows it", () => {
  assert.ok(!E.render(photographer).site.includes('"ownerLink":true'));
  assert.ok(E.render(photographer, { preview: true }).site.includes('"ownerLink":true'));
});

test("sanitizing twice changes nothing (the server and the browser both run it)", () => {
  const once = E.sanitize(photographer);
  const twice = E.sanitize(JSON.parse(JSON.stringify(once)));
  assert.deepStrictEqual(twice, once);
});

test("prototype names can't crash the engine", () => {
  assert.doesNotThrow(() => E.render({ look: "constructor", voice: "__proto__", business: { name: "X" } }));
  const p = E.sanitize({ look: "toString", voice: "constructor" });
  assert.strictEqual(p.look, "studio"); assert.strictEqual(p.voice, "bold");
});

test("two fields with the same label get different ids", () => {
  const p = E.sanitize({ booking: { types: [{ label: "Party", fields: [{ label: "Age" }, { label: "Age" }] }] } });
  assert.deepStrictEqual(p.booking.types[0].fields.map(f => f.id), ["age", "age-2"]);
});

test("unconnected builds say so and stay out of search", () => {
  const live = E.render(photographer).site;
  assert.match(live, /<meta name="robots" content="noindex">/);
  assert.ok(live.includes('"connected":false'));
  assert.ok(!E.render(photographer, { connected: true }).site.includes('content="noindex"'));
});

test("section switches and hidden collections drop out of the site", () => {
  const p = JSON.parse(JSON.stringify(photographer));
  p.show = { pricing: false, recent: false }; p.collections[1].hidden = true;
  const s = E.sanitize(p);
  assert.strictEqual(s.show.pricing, false); assert.strictEqual(s.show.about, true);
  assert.strictEqual(s.collections[1].hidden, true);
  assert.deepStrictEqual(E.sanitize(JSON.parse(JSON.stringify(s))), s);
});

test("planner questions are kept but never printed on the pages", () => {
  const out = E.render({ business: { name: "Q Co" }, questions: [{ question: "Do they show prices publicly?", options: ["Yes", "No"] }] });
  assert.strictEqual(out.profile.questions[0].options.length, 2);
  assert.ok(!/Do they show prices publicly\?<\/|>Do they show prices/.test(out.site.replace(/<script>window\.__PROFILE__[\s\S]*?<\/script>/, "")));
});

test("live and downloaded pages don't carry the planner's questions or Ben's todos", () => {
  const p = Object.assign({}, photographer, { questions: [{ question: "Internal question?" }] });
  const live = E.render(p).site, preview = E.render(p, { preview: true }).site;
  assert.ok(!live.includes("Internal question?") && !live.includes("Starting prices for each lane"));
  assert.ok(preview.includes("Internal question?"));
});

test("client sites load self-hosted fonts, never Google's", () => {
  const fs = require("node:fs"), path = require("node:path");
  for (const voice of ["bold", "clean", "warm", "nonsense"]) {
    const out = E.render({ ...photographer, voice });
    for (const page of [out.site, out.dashboard]) assert.ok(!/fonts\.(googleapis|gstatic)/.test(page), "no Google Fonts");
    const css = out.site.match(/https:\/\/plainlineops\.com\/fonts\/(voice-\w+\.css)/);
    assert.ok(css, "links the voice's stylesheet");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "fonts", css[1])), `${css[1]} exists`);
  }
});
