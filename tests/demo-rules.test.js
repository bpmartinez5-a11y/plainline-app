// The demo's built-in replies (rulesAgent in demo.html), used when AI replies are off or unavailable.
// demo.html has one inline script; run it up to the DOM wiring so the tests need no browser.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const vm = require("vm");

const html = fs.readFileSync(require("path").join(__dirname, "..", "demo.html"), "utf8");
const src = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const code = src.slice(0, src.indexOf('document.addEventListener("click"')) + ";this.__t = {rulesAgent, PRESETS, PRESET_LABEL, S, clone};";
const ctx = { localStorage: { getItem: () => null, setItem() {} }, matchMedia: () => ({ matches: false }) };
vm.runInNewContext(code, ctx);
const { rulesAgent, PRESETS, PRESET_LABEL, S, clone } = ctx.__t;

const ask = (preset, text) => { S.config = clone(PRESETS[preset]); return rulesAgent({ msgs: [{ from: "customer", text }] }); };

test("every preset has a matching key and a label", () => {
  for (const [k, p] of Object.entries(PRESETS)) {
    assert.strictEqual(p.preset, k);
    assert.ok(PRESET_LABEL[k], k);
  }
});

test("clinic: reactions and allergies go to a person", () => {
  for (const t of ["I had a reaction after my shot", "side effects?", "I have allergies", "my arm is swollen", "talk to a person"])
    assert.strictEqual(ask("clinic", t).handoff, true, t);
  assert.match(ask("clinic", "I think it's anaphylaxis").reply, /911/);
});

test("clinic: medical questions are declined, not answered or booked", () => {
  for (const t of ["what dose should I take", "my test results came back", "what's the dose for the lab draw", "are these symptoms normal"]) {
    const r = ask("clinic", t);
    assert.match(r.reply, /can't give medical advice/, t);
    assert.ok(!r.handoff && r.show === "none", t);
  }
  assert.strictEqual(ask("clinic", "I had a reaction to my lab results").handoff, true); // hand-off wins
});

test("clinic: booking questions still work", () => {
  assert.match(ask("clinic", "how much is bloodwork").reply, /\$65/);
  assert.strictEqual(ask("clinic", "first visit").serviceId, "newpt");
  assert.strictEqual(ask("clinic", "are you available Tuesday?").serviceId, undefined); // no service name starts with a word like "lab"
  assert.doesNotMatch(ask("clinic", "Do I bring my medications to the first visit?").reply, /medical advice/);
});

test("other presets never get the medical decline", () => {
  assert.doesNotMatch(ask("hvac", "can you diagnose my furnace noise?").reply, /medical/);
  assert.strictEqual(ask("salon", "I need a haircut").serviceId, "cut");
  for (const t of ["pet allergies, do you use pet-safe products?", "do you have a rash guard"])
    assert.ok(!ask("cleaning", t).handoff && !ask("fitness", t).handoff, t); // health words hand off only at the clinic
});
