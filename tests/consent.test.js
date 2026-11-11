// consent.js: Google and Meta ad tags load only with ids set AND the visitor's "Allow"; Global Privacy Control and
// "No thanks" keep them off. The privacy policy must describe it, and every ad landing page must load it.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path"), vm = require("vm");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const SRC = read("consent.js");

// A tiny stand-in for the browser: enough DOM for consent.js, and a log of every outside script it adds.
function run({ google = "", meta = "", stored = null, gpc = false, src = SRC } = {}) {
  const code = src.replace('google: ""', `google: ${JSON.stringify(google)}`).replace('meta: ""', `meta: ${JSON.stringify(meta)}`);
  const scripts = [], store = new Map(stored ? [["pl_ads_consent", stored]] : []);
  const listeners = {};
  const el = (tag) => {
    const node = { tag, style: {}, dataset: {}, attrs: {}, children: [], removed: false,
      setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); if (c.tag === "script") scripts.push(c.src); return c; },
      addEventListener(t, f) { (this.on ||= {})[t] = f; }, remove() { this.removed = true; },
      set innerHTML(h) { this.buttons = [...h.matchAll(/data-v="(\w+)"/g)].map((m) => Object.assign(el("button"), { dataset: { v: m[1] } })); this.html = h; },
      querySelectorAll() { return this.buttons || []; } };
    return node;
  };
  const body = el("body"), head = el("head");
  const window = {
    localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v), removeItem: (k) => store.delete(k) },
    navigator: { globalPrivacyControl: gpc },
    location: { reload() { window.reloaded = true; } },
    document: { head, body, createElement: el, getElementById: (id) => body.children.find((c) => c.id === id && !c.removed) || null,
      addEventListener: (t, f) => { listeners[t] = f; } },
  };
  window.window = window;
  vm.runInNewContext(code, window);
  const bannerEl = () => body.children.find((c) => c.id === "pl-consent" && !c.removed);
  const tap = (v) => bannerEl().buttons.find((b) => b.dataset.v === v).on.click();
  return { window, scripts, store, bannerEl, tap, listeners };
}

const G = "AW-123456789", M = "1234567890123456";

test("with no ids set (the default) nothing loads and no banner shows", () => {
  const r = run();
  assert.deepStrictEqual(r.scripts, []);
  assert.equal(r.bannerEl(), undefined);
  assert.equal(r.window.plAdsChoice(), "off");
  assert.match(SRC, /google: "",/, "the shipped file has no Google id yet");
  assert.match(SRC, /meta: "",/, "the shipped file has no Meta id yet");
});

test("ids set: a banner asks first and nothing loads before Allow", () => {
  const r = run({ google: G, meta: M });
  assert.ok(r.bannerEl(), "banner shown");
  assert.deepStrictEqual(r.scripts, [], "no tag before a choice");
  assert.equal(r.window.fbq, undefined);
  assert.equal(r.window.gtag, undefined);
});

test("Allow loads both tags and is remembered", () => {
  const r = run({ google: G, meta: M });
  r.tap("yes");
  assert.equal(r.bannerEl(), undefined);
  assert.equal(r.store.get("pl_ads_consent"), "yes");
  assert.ok(r.scripts.some((s) => s === "https://www.googletagmanager.com/gtag/js?id=" + G));
  assert.ok(r.scripts.some((s) => s === "https://connect.facebook.net/en_US/fbevents.js"));
  const again = run({ google: G, meta: M, stored: "yes" });
  assert.equal(again.bannerEl(), undefined);
  assert.equal(again.scripts.length, 2);
});

test("No thanks loads nothing, now or on the next visit", () => {
  const r = run({ google: G, meta: M });
  r.tap("no");
  assert.deepStrictEqual(r.scripts, []);
  assert.equal(r.store.get("pl_ads_consent"), "no");
  const again = run({ google: G, meta: M, stored: "no" });
  assert.equal(again.bannerEl(), undefined);
  assert.deepStrictEqual(again.scripts, []);
});

test("Global Privacy Control means no banner and no tags, even after an earlier Allow", () => {
  for (const stored of [null, "yes"]) {
    const r = run({ google: G, meta: M, gpc: true, stored });
    assert.equal(r.bannerEl(), undefined);
    assert.deepStrictEqual(r.scripts, []);
    assert.equal(r.window.plAdsChoice(), "gpc");
  }
});

test("a malformed id is ignored, so a typo can't load a stranger's tag", () => {
  const r = run({ google: "GTM-ABC", meta: "abc", stored: "yes" });
  assert.deepStrictEqual(r.scripts, []);
});

test("Change your choice clears it and asks again", () => {
  const r = run({ google: G, stored: "no" });
  assert.equal(r.window.plAdsChoice(), "asked");
  assert.equal(r.store.has("pl_ads_consent"), false);
  assert.ok(r.bannerEl());
});

test("only the booking link tap is sent, never form or chat content", () => {
  const code = SRC.replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\.value\b|FormData|querySelector\(["']input|textarea|email/i);
  assert.match(SRC, /a\[href\^="https:\/\/calendar\.app\.google\/"\]/);
});

test("ad landing pages load consent.js and the privacy policy describes it", () => {
  for (const f of ["index.html", "hvac-plumbing.html", "sell.html", "demo.html", "privacy.html"]) {
    assert.match(read(f), /<script defer src="\/consent\.js"><\/script>/, f);
  }
  const p = read("privacy.html");
  assert.match(p, /<h2 id="ads">Ad measurement<\/h2>/);
  assert.match(p, /only after you choose "Allow"/);
  assert.match(p, /Global Privacy Control/);
  assert.match(p, /plAdsChoice/);
  assert.match(p, /<b>Google Ads<\/b> and <b>Meta<\/b>/);
  assert.doesNotMatch(p, /We don't use advertising or tracking cookies, or analytics/, "the old no-cookies promise is gone");
});
