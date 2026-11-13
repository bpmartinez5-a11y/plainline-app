// Only a fit sees the booking page (Ben, Nov 13: the site qualifies every request before he sees it). The Nov 11
// booking test said a visitor always has a way to book; now a visitor whose answers make Plainline a fit always has one
// (after the request, and when a send fails), and nobody else gets the calendar from the home page, the trade pages or
// the seller page (public since Nov 13: the home page sends people looking for work there).
// The page has no build step and CI runs no browser, so these read the page's own script lines; the PR has the browser check.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const html = read("index.html");
const BOOK = (html.match(/const BOOK_URL = "([^"]+)"/) || [])[1];
const lines = (re) => html.split("\n").filter((l) => re.test(l));

test("the home page names one booking page", () => {
  assert.match(BOOK || "", /^https:\/\/calendar\.app\.google\/\w+$/);
  assert.match(html, /const bookLink = [^\n]*\n[^\n]*href: BOOK_URL/);
});

test("the booking page is never one click from the home page, a trade page or the seller page", () => {
  assert.equal(html.split("calendar.app.google").length - 1, 1, "only the script's BOOK_URL");
  for (const f of ["hvac-plumbing.html", "auto-repair.html", "sell.html"]) assert.ok(!read(f).includes("calendar.app.google"), f);
});

test("a visitor who is not a fit gets the seller page link only from qualify.js, on both forms, never the booking page", () => {
  assert.equal(lines(/pageLink\(q\.link\)/).length, 2, "the form's and the chat's not-a-fit answers");
  assert.equal(lines(/got === "no" && q\.link/).length, 1);
  assert.match(html, /if \(got === "no"\) \{ if \(q\.link\) m\.append\(" ", pageLink\(q\.link\), "\."\); return; \}/);
});

test("the script shows the booking link in three places, each only for a fit", () => {
  const calls = lines(/bookLink\(/).filter((l) => !/const bookLink = /.test(l)).map((l) => l.trim());
  assert.deepStrictEqual(calls, [
    'const say = (text, cls, link) => { msg.textContent = text; msg.className = cls; if (link) msg.append(" ", bookLink(link === "big"), link === "big" ? "" : "."); };',
    'const err = (t, link) => { bookMsg.textContent = t; bookMsg.className = "err"; if (link) bookMsg.append(" ", bookLink(), "."); };',
    'if (got === "fit") m.append(" ", bookLink(), ".");'
  ]);
  const gated = lines(/\b(say|err)\(fit \? (LIMIT|FAILED)\.fit : \2\.other, ("err", )?fit\);/);
  assert.equal(gated.length, 4, "form: limit and failed send; chat: limit and failed send");
  assert.equal(lines(/say\(after\(\{ \.\.\.q, fit: got \}, ""\), got === "no" \? "" : "ok", got === "fit" && "big"\);/).length, 1, "form thank-you");
  assert.equal(lines(/\b(say|err)\([^;()]*, true\);/).length, 0, "no booking link that skips the answer");
});

test("what each answer reads: a fit picks a time, a check hears back in 24 hours, not a fit reads why", () => {
  assert.match(html, /q\.fit === "fit" \? `Thanks\$\{n\}! Plainline is a fit for your business\. Pick your walkthrough time now:`/);
  assert.match(html, /: q\.fit === "no" \? `Thanks for reaching out\$\{n\}\. \$\{q\.note\}`\.trim\(\)/);
  assert.match(html, /: `Thanks\$\{n\}! Your request is in\. Plainline reads it and replies by email within 24 hours\.`;/);
  assert.match(html, /if \(f\.website\) return finish\("check"\); \/\/ a bot filled the hidden field: no booking page/);
  assert.match(html, /if \(f\.website\)\{ form\.reset\(\); return say\("Thanks! We'll be in touch\.", "ok"\); \}/, "the form's honeypot gets no link");
  assert.equal(lines(/FITS\.includes\(d\.fit\) \? d\.fit : q\.fit/).length, 2, "both forms take the server's answer when it sends one");
});

test("only our own limit says 'a few requests'; the spam check gets the failed-send message", () => {
  const limits = lines(/r\.status === 429[^\n]*return (say|err)\(/);
  assert.equal(limits.length, 2);
  for (const l of limits) assert.ok(l.includes('r.status === 429 && !r.headers.get("x-vercel-mitigated")'), l.trim());
  assert.ok(!/try again in an hour/i.test(html), "the old dead-end message is back");
});

test("the chat's name, email and question hints stay plain", () => {
  const hints = lines(/return err\("Please (add|answer)/);
  assert.equal(hints.length, 3);
  for (const l of hints) assert.ok(!/, (true|fit)\)/.test(l), l.trim());
});
