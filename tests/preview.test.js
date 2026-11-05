// Run: node --test tests/*.test.js
// Website previews (/api/preview): who may build one, that a build is claimed once and saved on the lead,
// and that the public page is labeled, unindexed and free of Ben's planner notes. Supabase, the scan and
// Claude are faked, so nothing leaves the machine.
const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const path = require("node:path");

const ORIGIN = "https://ops.plainlineops.com";
const LEAD = "11111111-2222-3333-4444-555555555555";
const PROFILE = { business: { name: "Pipe Pros", kind: "Plumbing", city: "Olathe", domain: "pipepros.example" }, contact: { phone: "ADD: phone number" }, look: "grid", voice: "clean", hero: { lines: ["Pipes fixed"] }, collections: [{ title: "Services", items: [{ title: "Drains" }] }], booking: { types: [{ label: "Repair" }] }, owner: { jobWord: "job" }, questions: [{ question: "SECRET PLANNER QUESTION" }], todos: ["SECRET TODO"] };

let db, calls, planFails;
function fakeSupabase() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      let b = ""; req.on("data", c => b += c); req.on("end", () => {
        const u = new URL(req.url, "http://x"), auth = req.headers.authorization;
        calls.push({ method: req.method, url: req.url, auth, body: b ? JSON.parse(b) : null });
        const json = o => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
        if (auth === "Bearer expired") { res.writeHead(401); return res.end("{}"); }
        const slug = u.searchParams.get("preview_slug");
        if (req.method === "GET" && slug) return json(db.preview_slug && slug === "eq." + db.preview_slug ? [{ preview_at: db.preview_at, ops_previews: db.profile ? { profile: db.profile } : null }] : []);
        if (req.method === "GET") return json(auth === "Bearer rep" ? [db] : []); // stands in for row-level security
        if (req.method === "POST" && u.pathname === "/rest/v1/ops_previews") { db.profile = JSON.parse(b).profile; return json([]); }
        if (req.method === "PATCH") {
          const body = JSON.parse(b);
          if (u.searchParams.get("or")) { // the claim: only when no build started in the last five minutes
            const free = !db.preview_at || Date.now() - new Date(db.preview_at).getTime() > 5 * 60 * 1000;
            if (!free) return json([]);
          }
          Object.assign(db, body); return json([{ id: LEAD }]);
        }
        res.writeHead(400); res.end("{}");
      });
    }).listen(0, () => resolve(srv));
  });
}

function load(sbPort) {
  process.env.SUPABASE_URL = "http://127.0.0.1:" + sbPort;
  process.env.SUPABASE_ANON_KEY = "anon"; process.env.SUPABASE_SERVICE_ROLE_KEY = "service"; process.env.ANTHROPIC_API_KEY = "x";
  const api = p => require.resolve(path.join("..", "api", p));
  // Stand-ins for the scan and the planner (both are tested in their own files).
  require.cache[api("studio-scan.js")] = { id: api("studio-scan.js"), filename: api("studio-scan.js"), loaded: true, exports: { scanSite: async url => ({ site: { url }, pages: [], domain: "pipepros.example" }) } };
  require.cache[api("studio-profile.js")] = { id: api("studio-profile.js"), filename: api("studio-profile.js"), loaded: true, exports: { plan: async () => { if (planFails) throw new Error("model down"); return JSON.parse(JSON.stringify(PROFILE)); } } };
  delete require.cache[api("preview.js")];
  return require("../api/preview.js");
}

function call(handler, req) {
  return new Promise(resolve => {
    const headers = {}; let code = 200, out = "";
    const res = {
      status(c) { code = c; return this; }, setHeader(k, v) { headers[k.toLowerCase()] = v; return this; },
      json(o) { out = JSON.stringify(o); resolve({ code, headers, body: o }); }, end(t) { out = t || ""; resolve({ code, headers, text: out }); }
    };
    handler(Object.assign({ headers: {}, query: {} }, req), res);
  });
}
const post = (h, body, headers = {}) => call(h, { method: "POST", headers: Object.assign({ origin: ORIGIN, authorization: "Bearer rep" }, headers), body: JSON.stringify(body) });

let srv, handler;
test.before(async () => { srv = await fakeSupabase(); handler = load(srv.address().port); });
test.after(() => srv.close());
test.beforeEach(() => { calls = []; planFails = false; db = { id: LEAD, business: "Pipe Pros", website: "https://pipepros.example", status: "approved", preview_slug: null, preview_at: null, profile: null }; });

test("only The Engine's page, signed in, can ask for a preview", async () => {
  assert.strictEqual((await post(handler, { id: LEAD }, { origin: "https://evil.example" })).code, 403);
  assert.strictEqual((await post(handler, { id: LEAD }, { authorization: "" })).code, 400);
  assert.strictEqual((await post(handler, { id: "nope" })).code, 400);
  assert.strictEqual((await post(handler, { id: LEAD }, { authorization: "Bearer expired" })).code, 401);
  assert.strictEqual((await post(handler, { id: LEAD }, { authorization: "Bearer someone-else" })).code, 404);
  assert.strictEqual((await call(handler, { method: "OPTIONS", headers: { origin: ORIGIN } })).code, 204);
});

test("previews are for approved leads with a website", async () => {
  db.status = "pending";
  assert.strictEqual((await post(handler, { id: LEAD })).code, 409);
  db.status = "approved"; db.website = null;
  assert.strictEqual((await post(handler, { id: LEAD })).code, 422);
});

test("builds once, saves it on the lead and returns the link", async () => {
  const r = await post(handler, { id: LEAD });
  assert.strictEqual(r.code, 200);
  assert.match(r.body.url, /^https:\/\/plainlineops\.com\/preview\/pipe-pros-[0-9a-f]{10}$/);
  assert.ok(db.profile && db.preview_slug && db.preview_at);
  assert.ok(calls.filter(c => c.method !== "GET").every(c => c.auth === "Bearer service"), "saves use the service key, not the rep's token");
  const again = await post(handler, { id: LEAD });
  assert.strictEqual(again.body.url, r.body.url, "a second open returns the saved link, no new build");
});

test("a second build inside five minutes is refused; a rebuild keeps the same link", async () => {
  const first = await post(handler, { id: LEAD });
  assert.strictEqual((await post(handler, { id: LEAD, fresh: true })).code, 429);
  db.preview_at = new Date(Date.now() - 6 * 60 * 1000).toISOString();
  const rebuilt = await post(handler, { id: LEAD, fresh: true });
  assert.strictEqual(rebuilt.code, 200);
  assert.strictEqual(rebuilt.body.url, first.body.url);
});

test("a failed build gives the claim back so the rep can retry", async () => {
  planFails = true;
  const r = await post(handler, { id: LEAD });
  assert.strictEqual(r.code, 422);
  assert.strictEqual(db.preview_at, null);
  planFails = false;
  assert.strictEqual((await post(handler, { id: LEAD })).code, 200);
});

test("the public page is labeled, unindexed and has no planner notes", async () => {
  const { body } = await post(handler, { id: LEAD });
  const slug = body.url.split("/").pop();
  const r = await call(handler, { method: "GET", query: { slug } });
  assert.strictEqual(r.code, 200);
  assert.match(r.headers["x-robots-tag"], /noindex/);
  assert.match(r.text, /Concept preview by Plainline/);
  assert.match(r.text, /Pipe Pros/);
  assert.doesNotMatch(r.text, /SECRET PLANNER QUESTION|SECRET TODO/);
  assert.doesNotMatch(r.text, /ADD: phone number/, "Ben's blanks stay off the owner's page");
  assert.doesNotMatch(r.text, /rel="canonical"/, "no canonical to the business's real domain");
  assert.match(r.text, /"shared":true/);
  assert.match(r.text, /"ownerLink":false/);
});

test("a link stops working 30 days after its last build", async () => {
  const { body } = await post(handler, { id: LEAD });
  db.preview_at = new Date(Date.now() - 31 * 864e5).toISOString();
  assert.strictEqual((await call(handler, { method: "GET", query: { slug: body.url.split("/").pop() } })).code, 404);
});

test("slugs always carry 10 random characters, even for a one-letter name", () => {
  for (let i = 0; i < 2000; i++) assert.match(handler.newSlug(i % 2 ? "Q" : "Pipe Pros"), /^(site|pipe-pros)-[0-9a-f]{10}$/);
});

test("unknown or malformed links show a plain not-found page", async () => {
  assert.strictEqual((await call(handler, { method: "GET", query: { slug: "pipe-pros-zzzzzzzzzz" } })).code, 404);
  assert.strictEqual((await call(handler, { method: "GET", query: { slug: "../../etc" } })).code, 404);
  assert.strictEqual((await call(handler, { method: "GET", query: { slug: "x&select=*" } })).code, 404);
});
