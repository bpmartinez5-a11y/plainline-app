// The named founder block (Ben, Nov 11: "implement named founder block"). Answer engines trust a page more when a real
// person stands behind it. The block names Ben and Plainline only: never his day job, his employer or finance, which
// stay off every Plainline page (CLAUDE.md: Plainline never carries Ben's money or personal data; the-enforcer's
// Creative Planning boundary).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const FOUNDER = { "@type": "Person", name: "Ben Martinez", jobTitle: "Founder" };

test("the home page names the founder in a visible block and in the Organization schema", () => {
  const html = read("index.html");
  const block = html.slice(html.indexOf('<section id="founder"'), html.indexOf('<section id="contact"'));
  assert.match(block, /<h2 id="founderTitle">Who you work with<\/h2>/);
  assert.match(block, /Ben Martinez founded Plainline and runs it from Overland Park, Kansas\./);
  assert.deepStrictEqual(ld(html).find((j) => j["@type"] === "Organization").founder, FOUNDER);
});

test("the HVAC page names the founder next to the walkthrough and in the provider schema", () => {
  const html = read("hvac-plumbing.html");
  assert.match(html, /book 20 minutes with Ben Martinez, Plainline's founder/);
  assert.deepStrictEqual(ld(html).find((j) => j["@type"] === "Service").provider.founder, FOUNDER);
});

test("llms.txt names the founder", () => {
  assert.match(read("llms.txt"), /Founder: Ben Martinez, in Overland Park, Kansas\./);
});

test("no Plainline page mentions the founder's day job, employer or a home address", () => {
  for (const f of ["index.html", "hvac-plumbing.html", "sell.html", "demo.html", "privacy.html", "terms.html", "llms.txt"]) {
    const s = read(f);
    assert.doesNotMatch(s, /creative planning|financial (advisor|adviser|planner|planning)|wealth manage|\bCFP\b|\bRIA\b|FINRA/i, f);
    assert.doesNotMatch(s, /10401|College Blvd|Apt\.? \d/i, f);
  }
});
