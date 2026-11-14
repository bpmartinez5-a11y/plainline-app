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
  assert.match(p, /your email if you give it, the time you picked, why you asked for a person/);
  assert.match(p, /When you call us, it holds your phone number the same way/);
  assert.match(p, /a short note and a call reference number/);
  assert.match(p, /or no one picks up when it connects you, we save the number you called from/);
  assert.match(p, /during our hours \(8 AM to 8 PM Central\)/);
  assert.match(p, /a short summary of the call for 90 days/);
  assert.match(read("docs/subprocessors.md"), /^\| ElevenLabs \(added Nov 13, 2026\)/m);
});

test("the privacy policy names the voicemail, who keeps it, the 90 days and who hears of it", () => {
  const p = read("privacy.html");
  assert.match(p, /you can leave a voicemail\. Twilio records it and writes a text copy, which we add to your request\. We delete the recording and both text copies, ours and Twilio's, after 90 days\./);
  assert.match(p, /goes by email or text to the person at Plainline who calls you back, and that person can play your voicemail/);
  assert.match(p, /<li><b>Twilio<\/b>[^<]*keeps voicemails and their text copies until we delete them after 90 days/);
  assert.match(p, /<li><b>Resend<\/b> sends our team's work emails/);
  const subs = read("docs/subprocessors.md");
  assert.match(subs, /^\| Twilio .*voicemail recordings.*deletes them after 90 days/m);
  assert.match(subs, /^\| Resend .*front desk notice/m);
});
