// The contact form's source tag must fit the live leads table (source is at most 50 characters), or the insert fails.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const line = html.split("\n").find((l) => l.startsWith("const leadSource = "));
const leadSource = (search) => new Function("location", line.replace("const leadSource = ", "return ").replace(/; \/\/.*$/, ""))({ search })();

test("no campaign tag means plain website", () => assert.equal(leadSource(""), "website"));
test("a campaign tag is kept and cleaned", () => assert.equal(leadSource("?utm_source=google&utm_campaign=kc fall<x>"), "website · google/kcfallx"));
test("a long campaign tag still fits the 50-character column", () => {
  const s = leadSource("?utm_source=facebook&utm_campaign=fall_hvac_walkthrough_offer_retarget_" + "x".repeat(100));
  assert.ok(s.length <= 50, s.length);
});
