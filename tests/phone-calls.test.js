// node --test tests/phone-calls.test.js: calls to Plainline's number are answered by an AI voice (Ben, Nov 13, Move 3),
// so the privacy policy must say so before the first real call: AI first, recorded, who runs it, and how long it is kept.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

test("the privacy policy names phone calls, the recording, ElevenLabs and the 90 days", () => {
  const p = read("privacy.html");
  assert.match(p, /<b>Phone calls\.<\/b> When you call our business number, an automated AI assistant answers\./);
  assert.match(p, /says it is an automated assistant and that the call is recorded/);
  assert.match(p, /<li><b>ElevenLabs<\/b>/);
  assert.match(p, /We never call you with an AI voice\./);
  assert.match(p, /deleted after 90 days/);
  assert.match(read("docs/subprocessors.md"), /^\| ElevenLabs \(added Nov 13, 2026\)/m);
});
