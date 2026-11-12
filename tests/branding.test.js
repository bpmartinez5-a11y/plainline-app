// The Plainline logo (Ben's pick, Nov 12: "B · Full stop"): every page uses the same icon files, and the
// retired marks (the teal P and the typed "P/") do not come back. A renamed or deleted icon file fails here.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const root = path.join(__dirname, "..");
const pages = fs.readdirSync(root).filter((f) => f.endsWith(".html"));
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("every page links the SVG favicon", () => {
  for (const f of pages) assert.match(read(f), /<link rel="icon" href="\/icons\/favicon\.svg"/, f);
});

test("every /icons/ file a page or the manifest names exists", () => {
  const refs = new Set();
  for (const f of [...pages, "manifest.webmanifest"]) for (const m of read(f).matchAll(/\/icons\/[\w.-]+/g)) refs.add(m[0]);
  assert.ok(refs.size > 0);
  for (const r of refs) assert.ok(fs.existsSync(path.join(root, r)), r);
});

test("the retired marks are gone: no typed P/ logo, no teal in the consent banner", () => {
  for (const f of pages) assert.doesNotMatch(read(f), />P\/</, f);
  assert.doesNotMatch(read("consent.js"), /#0d6b71|#7fd3d6/i);
});
