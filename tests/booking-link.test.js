// A visitor always has a way to book (Nov 11 booking test): the contact section links the booking page,
// and every failed send (our limit, the spam check, no signal) offers it instead of a dead end.
// The page has no build step and CI runs no browser, so these read the page's own script lines.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const html = read("index.html");
const BOOK = (html.match(/const BOOK_URL = "([^"]+)"/) || [])[1];
const lines = (re) => html.split("\n").filter((l) => re.test(l));

test("the home page names one booking page, the same one the other pages use", () => {
  assert.match(BOOK || "", /^https:\/\/calendar\.app\.google\/\w+$/);
  for (const f of ["sell.html", "hvac-plumbing.html"]) assert.ok(read(f).includes(BOOK), f);
  assert.match(html, /const bookLink = [^\n]*\n[^\n]*href: BOOK_URL/);
});

test("the contact section links the booking page", () => {
  const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('id="leadForm"'));
  assert.ok(contact.includes(`href="${BOOK}"`));
});

test("the form and chat messages add the link only when asked", () => {
  assert.match(html, /const say = \(text, cls, link\) => \{[^\n]*if \(link\) msg\.append\(" ", bookLink\(\)/);
  assert.match(html, /const err = \(t, link\) => \{[^\n]*if \(link\) bookMsg\.append\(" ", bookLink\(\)/);
});

test("every thank-you and every failed send offers the booking link", () => {
  assert.ok(!/try again in an hour/i.test(html), "the old dead-end message is back");
  const offers = lines(/\b(say|err)\("(Sorry, that didn't send|We already have a few requests|Thanks! Your message is in)/);
  assert.equal(offers.length, 5, "form: thanks, limit, failed; chat: limit, failed");
  for (const l of offers) assert.match(l, /, true\);(\s*\/\/.*)?$/, l.trim());
  assert.equal(lines(/say\("in", `Thanks, \$\{name[^\n]*\.append\(" ", bookLink\(\), "\."\);$/).length, 1, "chat thank-you");
});

test("only our own limit says 'a few requests'; the spam check gets the failed-send message", () => {
  const limits = lines(/r\.status === 429[^\n]*return (say|err)\(/);
  assert.equal(limits.length, 2);
  for (const l of limits) assert.ok(l.includes('r.status === 429 && !r.headers.get("x-vercel-mitigated")'), l.trim());
});

test("the chat's name and email hints stay plain", () => {
  const hints = lines(/return err\("Please add/);
  assert.equal(hints.length, 2);
  for (const l of hints) assert.ok(!l.includes(", true)"), l.trim());
});
