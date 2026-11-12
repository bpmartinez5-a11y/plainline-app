// The site's Vercel settings from the production checklist (Nov 12): security headers on every path, a year-long cache
// for the hashed font files, and repo-only folders kept off the site. A later edit to vercel.json must not drop them.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");

const root = path.join(__dirname, "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "vercel.json"), "utf8"));
const rule = (source) => cfg.headers.find((h) => h.source === source);
const header = (source, key) => (rule(source)?.headers.find((h) => h.key === key) || {}).value || "";

test("every path gets the CSP baseline and the Permissions-Policy", () => {
  const csp = header("/(.*)", "Content-Security-Policy");
  for (const d of ["object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'"]) assert.ok(csp.includes(d), d);
  const pp = header("/(.*)", "Permissions-Policy");
  for (const d of ["camera=()", "microphone=()", "geolocation=()"]) assert.ok(pp.includes(d), d);
  assert.equal(header("/(.*)", "X-Frame-Options"), "DENY");
});

test("hashed font files cache for a year; the font CSS does not", () => {
  const src = "/fonts/(.+\\.woff2)";
  assert.match(header(src, "Cache-Control"), /max-age=31536000, immutable/);
  const re = new RegExp("^" + src.replace(/\//g, "\\/") + "$");
  const files = fs.readdirSync(path.join(root, "fonts"));
  for (const f of files.filter((f) => f.endsWith(".woff2"))) assert.match("/fonts/" + f, re);
  for (const f of files.filter((f) => f.endsWith(".css"))) assert.doesNotMatch("/fonts/" + f, re);
  // Vercel applies the later rule last, so the year-long rule must come after the 1-day /fonts/(.*) rule.
  assert.ok(cfg.headers.indexOf(rule(src)) > cfg.headers.indexOf(rule("/fonts/(.*)")));
});

test("repo-only folders are not served", () => {
  const ignored = fs.readFileSync(path.join(root, ".vercelignore"), "utf8").split("\n").map((l) => l.trim());
  for (const f of ["tests", "shots", "docs", "clients", "CLAUDE.md"]) assert.ok(ignored.includes(f), f);
});
