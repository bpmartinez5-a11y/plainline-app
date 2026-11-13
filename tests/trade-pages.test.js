// The trade landing pages (hvac-plumbing.html, auto-repair.html): search and answer engines read them, and each is the
// landing page for its ad tests. It must never show a price, its FAQ schema must say exactly what the page says (answer engines quote
// the schema), and search engines must be able to find it.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

// A price, amount or rate in any form: $99, USD 500, 2.5k, 10%, 10 percent, 500 dollars, /mo, a month, per job, starting at, flat fee.
const PRICE = /[$€£¥]\s?\d|\b(usd|eur|gbp)\s?\d|\b\d+(\.\d+)?\s?(%|k\b|percent\b|dollars|bucks|usd\b)|\b(per|each)\s(month|year|week|minute|hour|call|lead|job|text|booking|seat|location|user|truck|site)\b|\ba (month|year)\b|\/\s?(mo|month|yr|year|hr|hour)\b|\bstarting at\b|\bflat fee\b/i;

test("the price check catches every form of a price and passes plain words", () => {
  for (const bad of ["$99", "€ 50", "¥500", "USD 500", "10 percent", "per location", "2k setup", "2.5k", "10%", "500 dollars", "/mo", "/ month", "a month", "per job", "each call", "starting at", "flat fee"]) assert.match(bad, PRICE, bad);
  for (const ok of ["every month", "under 5 minutes", "a 20-minute walkthrough", "What happens to a call you miss", "within 24 hours"]) assert.doesNotMatch(ok, PRICE, ok);
});

for (const slug of ["hvac-plumbing", "auto-repair"]) {
  const html = read(`${slug}.html`);
  const URL = `https://plainlineops.com/${slug}`;
  const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

  test(`${slug}: the page shows no price, dollar amount or rate`, () => {
    const visible = text(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " "));
    const attrs = [...html.matchAll(/\b(?:content|alt|aria-label|title|placeholder)="([^"]*)"/g)].map((m) => m[1]).join(" | ");
    const schema = JSON.stringify(jsonld);
    for (const s of [visible, attrs, schema]) assert.doesNotMatch(s, PRICE);
    assert.doesNotMatch(schema, /"(priceRange|offers|price|priceCurrency)"/, "no price fields in the schema");
    const cost = jsonld.find((j) => j["@type"] === "FAQPage").mainEntity.find((q) => q.name === "What does it cost?");
    assert.match(cost.acceptedAnswer.text, /gets a quote after the walkthrough/);
    assert.match(cost.acceptedAnswer.text, /We don't publish prices/);
  });

  test(`${slug}: the FAQ schema matches the Questions section word for word`, () => {
    const faq = jsonld.find((j) => j["@type"] === "FAQPage");
    assert.ok(faq, "FAQPage schema is on the page");
    const shown = [...html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map((m) => [text(m[1]), text(m[2])]);
    assert.deepStrictEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), shown);
    assert.ok(shown.length >= 5);
  });

  test(`${slug}: the Service schema names the area and the provider`, () => {
    assert.deepStrictEqual(jsonld.map((j) => j["@type"]).sort(), ["FAQPage", "Service"], "one Service and one FAQPage, nothing else");
    const svc = jsonld.find((j) => j["@type"] === "Service");
    assert.equal(svc.url, URL);
    assert.equal(svc.areaServed.name, "Kansas City metropolitan area");
    assert.equal(svc.provider.url, "https://plainlineops.com/");
  });

  test(`${slug}: search engines can find it: canonical, sitemap, llms.txt and a home page link`, () => {
    assert.match(html, new RegExp(`<link rel="canonical" href="${URL}">`));
    assert.doesNotMatch(html, /name="robots" content="noindex"/);
    assert.match(read("sitemap.xml"), new RegExp(`<loc>${URL}</loc>`));
    assert.match(read("llms.txt"), new RegExp(`\\(${URL}\\)`));
    assert.match(read("index.html"), new RegExp(`href="/${slug}"`));
  });

  test(`${slug}: the first screen says it is automated and offers the walkthrough and the demo`, () => {
    const hero = html.slice(html.indexOf('<section aria-labelledby="h1">'), html.indexOf("</section>"));
    assert.match(hero, /<p class="lede">[^<]*It always says it is automated\.<\/p>/);
    assert.match(hero, /<a class="btn" href="\/#contact">Book a walkthrough<\/a>/, "the walkthrough starts with the five questions");
    assert.match(hero, /href="\/demo"/);
    assert.match(hero, /Texting on your business number starts once the phone carriers approve it\./);
  });

  test(`${slug}: the AI answer, the call-to-action words and the example label stay true`, () => {
    const ai = jsonld.find((j) => j["@type"] === "FAQPage").mainEntity.find((q) => q.name === "Is it a person or AI?");
    assert.match(ai.acceptedAnswer.text, /It is an AI front desk, and it always tells customers it is automated\./);
    const book = [...html.matchAll(/<a class="btn" href="\/#contact">(.*?)<\/a>/g)].map((m) => m[1]);
    assert.deepStrictEqual(book, ["Book a walkthrough", "Book a walkthrough"], "top and bottom");
    assert.ok(!html.includes("calendar.app.google"), "the booking page comes after the questions, only for a fit");
    assert.match(html, /for \(const a of document\.querySelectorAll\('a\[href="\/#contact"\]'\)\) a\.search = location\.search;/, "ad tags ride along");
    for (const [, href] of html.matchAll(/<a [^>]*href="(https?:\/\/[^"]*)"/g)) assert.match(href, /^https:\/\/plainlineops\.com\//, href);
    assert.match(html, /<figure class="box card">[\s\S]*made-up customer[\s\S]*<figcaption[^>]*>[^<]*values illustrative<\/figcaption>\s*<\/figure>/);
  });
}
