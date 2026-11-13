// The seller page (sell.html, sent from The Engine's Send to box). Its answers go through /api/lead, so they must pass
// that endpoint's own check (api/lead.js lead()), and the page must never show a price or a pay term.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
const { lead } = require("../api/lead.js")._test;

const html = fs.readFileSync(path.join(__dirname, "..", "sell.html"), "utf8");
const line = html.split("\n").find((l) => l.startsWith("const answers = "));
const answers = new Function(line.replace("const answers = ", "return ").replace(/; \/\/.*$/, ""))();
const SOURCE = html.match(/source: "([^"]+)"/)[1];
const full = { want: ["Bringing owners to Plainline", "AI for my own business"], now: "Service manager", sold: "Yes, to business owners",
  know: ["Golf"], reach: "Text", phone: "913 555 0100", note: "When do we start?" };

test("the answers pass the lead endpoint's check with the page's source", () => {
  const row = lead({ name: "Sam", email: "sam@example.com", message: answers(full), source: SOURCE });
  assert.ok(row, "lead() refused the seller answers");
  assert.equal(row.source, "website · sellers");
  assert.match(row.message, /^Seller page answers\nInterested in: Bringing owners to Plainline; AI for my own business\n/);
  assert.match(row.message, /\nPhone: 913 555 0100\n/);
});

test("empty answers are left out, and a long note still fits the 5000-character column", () => {
  assert.equal(answers({ want: [], now: "", sold: "", know: [], reach: "Email", phone: "", note: "" }), "Seller page answers\nReach by: Email");
  assert.ok(answers({ ...full, note: "x".repeat(9000) }).length <= 5000);
});

test("the page shows no price, dollar amount or pay rate", () => {
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(text, /[$€£]\s?\d|\b\d+\s?%|\bper (month|hour|lead|call)\b|\bcommission rate\b/i);
});

test("the page is public now, so it keeps the seller details for the seller kit: no lead steps, rules, pay terms or booking link", () => {
  // Ben, Nov 13: "need to take this out of the sell page if it's going to be public" (the home page links here for "Looking for work").
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");
  assert.doesNotMatch(text, /How a lead moves|The rules|How you get paid|90 days|earn a share|pays you|you get paid|intro call/i);
  assert.ok(!html.includes("calendar.app.google"), "no booking link");
  assert.doesNotMatch(html, /pick a time/i, "no message points at a booking link that is gone");
  assert.match(text, /5 quick questions/);
});

test("the page is kept out of search and out of the sitemap", () => {
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8"), /\/sell/);
});

test("the privacy policy names what the seller page saves", () => {
  assert.match(fs.readFileSync(path.join(__dirname, "..", "privacy.html"), "utf8"), /<b>Seller questions\.<\/b>/);
});

test("a filled hidden field keeps the answers and never shows success", () => {
  // Autofill can fill the hidden "website" field; the server then saves nothing (api/lead.js), so the page must not say "Thanks".
  const hp = html.split("\n").find((l) => l.includes('if (v("website"))'));
  assert.ok(hp, "the honeypot check is on the page");
  assert.doesNotMatch(hp, /Thanks|form\.reset/);
  assert.match(hp, /"err"/);
});
