// A visitor always has a way to book (Nov 11 booking test): the contact section links the booking page,
// and every failed send (our limit, the spam check, no signal) offers it instead of a dead end.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const html = read("index.html");
const BOOK = (html.match(/const BOOK_URL = "([^"]+)"/) || [])[1];

test("the home page names one booking page, the same one the other pages use", () => {
  assert.match(BOOK || "", /^https:\/\/calendar\.app\.google\/\w+$/);
  for (const f of ["sell.html", "hvac-plumbing.html"]) assert.ok(read(f).includes(BOOK), f);
});

test("the contact section links the booking page", () => {
  const contact = html.slice(html.indexOf('id="contact"'), html.indexOf('id="leadForm"'));
  assert.ok(contact.includes(`href="${BOOK}"`));
});

test("every failed send offers the booking link", () => {
  assert.ok(!/try again in an hour/i.test(html), "the old dead-end message is back");
  const fails = html.match(/\b(say|err)\("(Sorry, that didn't send|We already have a few requests)[^\n]*/g) || [];
  assert.equal(fails.length, 4, "two failure messages each in the form and the chat");
  for (const f of fails) assert.match(f, /, true\);/, f);
});
