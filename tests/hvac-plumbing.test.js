// The HVAC and plumbing page (hvac-plumbing.html): search and answer engines read it, and it is the landing page for
// any ad test. It must never show a price, its FAQ schema must say exactly what the page says (answer engines quote
// the schema), and search engines must be able to find it.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const html = read("hvac-plumbing.html");
const URL = "https://plainlineops.com/hvac-plumbing";
const jsonld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const text = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

test("the page shows no price, dollar amount or rate", () => {
  const visible = text(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " "));
  const schema = JSON.stringify(jsonld);
  for (const s of [visible, schema]) assert.doesNotMatch(s, /[$€£]\s?\d|\b\d+\s?%|\bper (month|minute|hour|call|lead)\b|\b\d+\s?(dollars|bucks)\b|\/mo\b/i);
});

test("the FAQ schema matches the Questions section word for word", () => {
  const faq = jsonld.find((j) => j["@type"] === "FAQPage");
  assert.ok(faq, "FAQPage schema is on the page");
  const shown = [...html.matchAll(/<details><summary>(.*?)<\/summary><p>(.*?)<\/p><\/details>/g)].map((m) => [text(m[1]), text(m[2])]);
  assert.deepStrictEqual(faq.mainEntity.map((q) => [q.name, q.acceptedAnswer.text]), shown);
  assert.ok(shown.length >= 5);
});

test("the Service schema names the area and the provider", () => {
  const svc = jsonld.find((j) => j["@type"] === "Service");
  assert.equal(svc.url, URL);
  assert.equal(svc.areaServed.name, "Kansas City metropolitan area");
  assert.equal(svc.provider.url, "https://plainlineops.com/");
});

test("search engines can find it: canonical, sitemap, llms.txt and a home page link", () => {
  assert.match(html, new RegExp(`<link rel="canonical" href="${URL}">`));
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
  assert.match(read("sitemap.xml"), new RegExp(`<loc>${URL}</loc>`));
  assert.match(read("llms.txt"), new RegExp(`\\(${URL}\\)`));
  assert.match(read("index.html"), /href="\/hvac-plumbing"/);
});

test("the first screen says it is automated and offers the walkthrough and the demo", () => {
  const hero = html.slice(html.indexOf('<section aria-labelledby="h1">'), html.indexOf("</section>"));
  assert.match(hero, /always says it is automated/);
  assert.match(hero, /href="https:\/\/calendar\.app\.google\/[\w]+"[^>]*>Book a walkthrough</);
  assert.match(hero, /href="\/demo"/);
});
