// The glass look (jarvis-app design/glass.css, stamped by design/glass.py): each page here carries one stamped block, and
// every icon a page names has its rule in that block. A stale block shows up in jarvis-app's `glass.py --check`.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const PAGES = ["index.html", "demo.html", "studio.html", "sell.html", "privacy.html", "terms.html"];

for (const page of PAGES) {
  test(`${page} carries one glass block with every icon it names`, () => {
    const html = fs.readFileSync(path.join(__dirname, "..", page), "utf8");
    assert.equal(html.split("/*glass*/").length - 1, 1, "one /*glass*/ mark");
    assert.equal(html.split("/*glass-end*/").length - 1, 1, "one /*glass-end*/ mark");
    const block = html.slice(html.indexOf("/*glass*/"), html.indexOf("/*glass-end*/"));
    assert.match(block, /--g-ink:/, "the theme is stamped, not just the marks");
    const rest = html.replace(block, "");
    for (const [, name] of rest.matchAll(/\bgi-([a-z0-9]+)\b/g)) assert.ok(block.includes(`.gi-${name}{`), `icon gi-${name} has no rule`);
  });
}
