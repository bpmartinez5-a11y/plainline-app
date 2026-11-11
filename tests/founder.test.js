// The named founder block (Ben, Nov 11: "implement named founder block"). Answer engines trust a page more when a real
// person stands behind it. The block names Ben and Plainline only. His other work, finance and any home address stay
// off every Plainline page (CLAUDE.md: Plainline never carries Ben's money or personal data). tests/ is in
// .vercelignore, so this file is never served.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const FOUNDER = { "@type": "Person", name: "Ben Martinez", jobTitle: "Founder" };

test("the home page names the founder in a visible block and in the Organization schema", () => {
  const html = read("index.html");
  const block = html.slice(html.indexOf('<section id="founder"'), html.indexOf('<section id="contact"'));
  assert.match(block, /<h2 id="founderTitle">Who runs Plainline<\/h2>/);
  assert.match(block, /Ben Martinez founded Plainline in the Kansas City metro\. He does every walkthrough himself\./);
  assert.deepStrictEqual(ld(html).find((j) => j["@type"] === "Organization").founder, FOUNDER);
});

test("the HVAC page names the founder next to the walkthrough and in the provider schema", () => {
  const html = read("hvac-plumbing.html");
  assert.match(html, /book 20 minutes with Ben Martinez, Plainline's founder/);
  assert.deepStrictEqual(ld(html).find((j) => j["@type"] === "Service").provider.founder, FOUNDER);
});

test("llms.txt names the founder", () => {
  assert.match(read("llms.txt"), /Founder: Ben Martinez\. He does every walkthrough himself\./);
});

test("no public page mentions finance work, and the only street address is the Plainline mailbox", () => {
  const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html")).concat("llms.txt");
  assert.ok(pages.length >= 6);
  for (const f of pages) {
    const s = read(f);
    assert.doesNotMatch(s, /financial (advisor|adviser|planner|planning)|wealth manage|\bCFP\b|\bFINRA\b|investment advis/i, f);
    assert.doesNotMatch(s, /\bApt\.? ?\d/i, f);
    for (const [a] of s.matchAll(/\b\d{3,6} [A-Z][a-z]+ (Rd|Road|Blvd|St|Street|Ave|Avenue|Pkwy|Dr|Drive|Ln|Way)\b/g)) assert.match(a, /^11016 Quivira Rd$/, `${f}: ${a}`);
  }
});
