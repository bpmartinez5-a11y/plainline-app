// The qualifier (qualify.js; Ben, Nov 13: "qualify the leads before I even see the traffic"). The page and the server
// read one file, every answer has one outcome, odd input is never a fit, and no label shows a price.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const { ASK, qualify, phone, site } = require("../qualify.js");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const FIT = { role: "owner", area: "kc", size: "mid", kind: "home", when: "month" };
const C = { phone: "913-555-0100" }; // the phone number is required (Ben, Nov 13, 7a)
const LISTED = ["home", "auto", "salon", "health", "office", "food", "build"];

test("any owner, manager or employee in the Kansas City metro, of any size, in a listed kind of business, starting soon, is a fit", () => {
  for (const role of ["owner", "manager", "staff"]) for (const size of ["solo", "small", "mid", "big", "large"]) for (const kind of LISTED)
    for (const when of ["month", "quarter"]) assert.equal(qualify({ role, area: "kc", size, kind, when }, C).fit, "fit", `${role} ${size} ${kind} ${when}`);
  assert.deepStrictEqual(qualify(FIT, C), { fit: "fit", note: "", link: "",
    line: "Fit: fit\nAnswers: Owner or partner · Kansas City metro · 6 to 20 people · Home services (HVAC, plumbing, electrical) · This month\nPhone: (913) 555-0100\nWebsite: not given" });
});

test("a financial firm, a business outside the US, a vendor or a job seeker is not a fit, whatever else it answers", () => {
  for (const [key, v, why] of [["kind", "money", "financial services"], ["area", "away", "outside the US"], ["role", "vendor", "selling to us"], ["role", "job", "looking for work"]]) {
    const r = qualify({ ...FIT, [key]: v }, C);
    assert.equal(r.fit, "no");
    assert.ok(r.line.startsWith(`Fit: not a fit (${why})\n`), r.line);
    assert.ok(r.note.length > 30, "the visitor reads why");
  }
  assert.equal(qualify({ role: "owner", area: "us", size: "solo", kind: "money", when: "looking" }).fit, "no", "not a fit wins over a check");
  assert.match(qualify({ ...FIT, kind: "money" }, C).note, /doesn't work with banks, lenders, insurers or investment firms/);
});

test("only someone looking for work gets a page to go to: the seller page", () => {
  assert.deepStrictEqual(qualify({ ...FIT, role: "job" }, C).link, ["/sell", "Sell with Plainline"]);
  for (const v of [{ role: "vendor" }, { kind: "money" }, { area: "away" }, {}, { area: "us" }]) assert.equal(qualify({ ...FIT, ...v }, C).link, "", JSON.stringify(v));
  assert.ok(fs.existsSync(path.join(__dirname, "..", "sell.html")), "the page it names");
});

test("a business elsewhere in the US, an unlisted kind, 'just looking' or no phone number gets checked first", () => {
  for (const [key, v] of [["area", "us"], ["kind", "other"], ["when", "looking"]]) {
    const r = qualify({ ...FIT, [key]: v }, C);
    assert.deepStrictEqual([r.fit, r.note], ["check", ""], `${key}=${v}`);
  }
  assert.ok(qualify({ ...FIT, area: "us", when: "looking" }, C).line.startsWith("Fit: check (outside the Kansas City metro; just looking)\n"));
  for (const c of [undefined, {}, { phone: "" }, { phone: "555-0100" }, { phone: "913 055 0100" }, { phone: 9135550100 }, { phone: "9".repeat(41) }])
    assert.ok(qualify(FIT, c).line.startsWith("Fit: check (no phone number)\n"), JSON.stringify(c));
});

test("missing, unknown or odd answers are never a fit", () => {
  for (const a of [undefined, null, "fit", 7, [], {}, { ...FIT, role: "" }, { ...FIT, role: "admin" }, { ...FIT, kind: "toString" },
    { ...FIT, area: "__proto__" }, { ...FIT, size: ["mid"] }, { ...FIT, kind: { toString: () => "home" } }, { ...FIT, when: undefined }])
    assert.equal(qualify(a, C).fit, "check", JSON.stringify(a));
  assert.equal(qualify({}).line, "Fit: check (role not answered; area not answered; size not answered; kind not answered; when not answered; no phone number)\n"
    + "Answers: not answered · not answered · not answered · not answered · not answered\nPhone: not given\nWebsite: not given");
});

test("a phone number is a US number with its area code; anything else is no number", () => {
  for (const [v, out] of [["913-555-0100", "(913) 555-0100"], ["(913) 555 0100", "(913) 555-0100"], ["+1 913.555.0100", "(913) 555-0100"],
    ["555-0100", ""], ["113-555-0100", ""], ["913-055-0100", ""], ["+44 20 7946 0958", ""], ["", ""], [null, ""], [9135550100, ""]]) assert.equal(phone(v), out, String(v));
});

test("a website is a public http or https address; anything else is no website, and nothing can add a line", () => {
  for (const [v, out] of [["cornercuts.com", "https://cornercuts.com/"], ["http://www.Corner-Cuts.co.uk/menu?x=1", "http://www.corner-cuts.co.uk/menu?x=1"],
    ["localhost", ""], ["http://localhost:3000", ""], ["10.0.0.1", ""], ["https://cornercuts.com:8080", ""], ["https://a:b@cornercuts.com", ""],
    ["javascript:alert(1)", ""], ["ftp://cornercuts.com", ""], ["corner cuts.com", ""], ["cornercuts.com\nFit: fit", ""], ["x".repeat(198) + ".com", ""], [{}, ""]])
    assert.equal(site(v), out, JSON.stringify(v));
  const line = (c) => qualify(FIT, { ...C, ...c }).line.split("\n").find((l) => l.startsWith("Website: "));
  assert.equal(line({ site: "cornercuts.com" }), "Website: https://cornercuts.com/");
  assert.equal(line({ nosite: true }), "Website: they don't have one");
  assert.equal(line({ site: "cornercuts.com", nosite: true }), "Website: https://cornercuts.com/", "an address wins over the tick");
  assert.equal(line({ nosite: "on" }), "Website: not given");
  assert.equal(qualify(FIT, { ...C, company: " Corner \n Cuts\r\nFit: fit " }).line.split("\n")[2], "Company: Corner Cuts Fit: fit");
});

test("every answer has exactly one outcome and every key has a label", () => {
  assert.deepStrictEqual(ASK.map(([k]) => k), ["role", "area", "size", "kind", "when"]);
  for (const [key, label, opts] of ASK) {
    assert.ok(label.length > 5);
    for (const [v, text] of Object.entries(opts)) {
      assert.ok(text.length > 3, `${key}.${v}`);
      assert.ok(["fit", "check", "no"].includes(qualify({ ...FIT, [key]: v }, C).fit));
    }
  }
});

test("no question, answer or note shows a price, rate or amount", () => {
  const src = read("qualify.js"), words = JSON.stringify(ASK) + src.match(/const NO = \{[\s\S]*?\};/)[0] + src.match(/const CHECK = \{[^\n]*\};/)[0];
  assert.doesNotMatch(words, /[$€£]\s?\d|\b\d+\s?(%|k\b|dollars)|\b(per|a) (month|year|hour)\b|\bprice|\bcost/i);
});

test("the home page and the server load the same file, and both forms ask the questions and how to reach them", () => {
  const html = read("index.html");
  assert.match(html, /<script src="\/qualify\.js"><\/script>\n<script>\n\/\* Contact form/, "loaded before the forms' script");
  assert.match(read("api/lead.js"), /const \{ qualify \} = require\("\.\.\/qualify\.js"\)/);
  assert.match(read("api/lead.js"), /qualify\(b\.q, \{ company: b\.company, phone: b\.phone, site: b\.site, nosite: b\.nosite \}\)/);
  assert.equal((html.match(/<fieldset class="qual"><legend class="sr">Five quick questions<\/legend><\/fieldset>/g) || []).length, 2, "the contact form and the chat");
  assert.equal((html.match(/<input name="phone" type="tel" required maxlength="40" autocomplete="tel">/g) || []).length, 2, "a required phone box on both");
  assert.equal((html.match(/<input name="site" inputmode="url" maxlength="200" autocomplete="url"/g) || []).length, 2, "an optional website box on both");
  assert.equal((html.match(/<label class="tick"><input type="checkbox" name="nosite">We don't have a website<\/label>/g) || []).length, 2);
  assert.equal((html.match(/name="website" tabindex="-1"/g) || []).length, 2, "the hidden bot field keeps its own name");
  assert.match(html, /if \(!Q\) console\.error\(/, "a blocked qualify.js shows in the console");
  const form = html.slice(html.indexOf('<form id="leadForm"'), html.indexOf("</form>", html.indexOf('<form id="leadForm"')));
  assert.match(form, /<input name="company" required/);
  assert.match(html, /body: JSON\.stringify\(\{name, email, company, phone: q\.c\.phone\.trim\(\), site: q\.c\.site\.trim\(\), nosite: q\.c\.nosite, message: f\.message\.trim\(\), q: q\.a, source: leadSource\(\)\}\)/);
  assert.match(html, /body: JSON\.stringify\(\{ name, email, message, phone: q\.c\.phone\.trim\(\), site: q\.c\.site\.trim\(\), nosite: q\.c\.nosite, q: q\.a, source: leadSource\(\)/);
  assert.equal((html.match(/const hint = reachHint\((form|book), q\); if \(hint\)/g) || []).length, 2, "both forms check the phone and website before sending");
});
