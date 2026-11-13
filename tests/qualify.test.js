// The qualifier (qualify.js; Ben, Nov 13: "qualify the leads before I even see the traffic"). The page and the server
// read one file, every answer has one outcome, odd input is never a fit, and no label shows a price.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const { ASK, qualify } = require("../qualify.js");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const FIT = { role: "owner", area: "kc", size: "mid", kind: "home" };
const LISTED = ["home", "auto", "salon", "health", "office", "food", "build"];

test("an owner or manager in the Kansas City metro, with a team, in a listed kind of business is a fit", () => {
  for (const role of ["owner", "manager"]) for (const size of ["small", "mid", "big", "large"]) for (const kind of LISTED)
    assert.equal(qualify({ role, area: "kc", size, kind }).fit, "fit", `${role} ${size} ${kind}`);
  assert.deepStrictEqual(qualify(FIT), { fit: "fit", note: "", line: "Fit: fit\nAnswers: Owner or partner · Kansas City metro · 6 to 20 people · Home services (HVAC, plumbing, electrical)" });
});

test("a financial firm, a business outside the US or a vendor is not a fit, whatever else it answers", () => {
  for (const [key, v, why] of [["kind", "money", "financial services"], ["area", "away", "outside the US"], ["role", "vendor", "selling to us or looking for work"]]) {
    const r = qualify({ ...FIT, [key]: v });
    assert.equal(r.fit, "no");
    assert.ok(r.line.startsWith(`Fit: not a fit (${why})\n`), r.line);
    assert.ok(r.note.length > 30, "the visitor reads why");
  }
  assert.equal(qualify({ role: "staff", area: "us", size: "solo", kind: "money" }).fit, "no", "not a fit wins over a check");
  assert.match(qualify({ ...FIT, kind: "money" }).note, /doesn't work with banks, lenders, insurers or investment firms/);
});

test("an employee, a one-person business, a business elsewhere in the US or an unlisted kind gets checked first", () => {
  for (const [key, v] of [["role", "staff"], ["area", "us"], ["size", "solo"], ["kind", "other"]]) {
    const r = qualify({ ...FIT, [key]: v });
    assert.deepStrictEqual([r.fit, r.note], ["check", ""], `${key}=${v}`);
  }
  assert.ok(qualify({ ...FIT, area: "us", size: "solo" }).line.startsWith("Fit: check (outside the Kansas City metro; one-person business)\n"));
});

test("missing, unknown or odd answers are never a fit", () => {
  for (const a of [undefined, null, "fit", 7, [], {}, { ...FIT, role: "" }, { ...FIT, role: "admin" }, { ...FIT, kind: "toString" },
    { ...FIT, area: "__proto__" }, { ...FIT, size: ["mid"] }, { ...FIT, kind: { toString: () => "home" } }])
    assert.equal(qualify(a).fit, "check", JSON.stringify(a));
  assert.equal(qualify({}).line, "Fit: check (role not answered; area not answered; size not answered; kind not answered)\nAnswers: not answered · not answered · not answered · not answered");
});

test("every answer has exactly one outcome and every key has a label", () => {
  assert.deepStrictEqual(ASK.map(([k]) => k), ["role", "area", "size", "kind"]);
  for (const [key, label, opts] of ASK) {
    assert.ok(label.length > 5);
    for (const [v, text] of Object.entries(opts)) {
      assert.ok(text.length > 3, `${key}.${v}`);
      assert.ok(["fit", "check", "no"].includes(qualify({ ...FIT, [key]: v }).fit));
    }
  }
});

test("no question, answer or note shows a price, rate or amount", () => {
  const words = JSON.stringify(ASK) + read("qualify.js").match(/const NO = \{[\s\S]*?\};/)[0];
  assert.doesNotMatch(words, /[$€£]\s?\d|\b\d+\s?(%|k\b|dollars)|\b(per|a) (month|year|hour)\b|\bprice|\bcost/i);
});

test("the home page and the server load the same file, and both forms ask the questions", () => {
  const html = read("index.html");
  assert.match(html, /<script src="\/qualify\.js"><\/script>\n<script>\n\/\* Contact form/, "loaded before the forms' script");
  assert.match(read("api/lead.js"), /const \{ qualify \} = require\("\.\.\/qualify\.js"\)/);
  assert.equal((html.match(/<div class="qual" role="group" aria-label="Four quick questions"><\/div>/g) || []).length, 2, "the contact form and the chat");
  const form = html.slice(html.indexOf('<form id="leadForm"'), html.indexOf("</form>", html.indexOf('<form id="leadForm"')));
  assert.match(form, /<input name="company" required/);
  assert.match(html, /body: JSON\.stringify\(\{name, email, company, message: f\.message\.trim\(\), q: q\.a, source: leadSource\(\)\}\)/);
  assert.match(html, /body: JSON\.stringify\(\{ name, email, message, q: q\.a, source: leadSource\(\)/);
});
