// Website previews for The Engine (Ben, Nov 5): a rep opens an approved lead's pitch deck, and the Engine page
// asks for a free preview of that business's new website. Same path as the Studio: scan their site, Claude
// writes a profile, studio-engine.js renders it. The profile is saved in ops_previews (the link on the lead) and served
// at plainlineops.com/preview/<slug>, a link the rep can text to the owner.
//
// POST /api/preview {id, fresh?}  from ops.plainlineops.com, with the rep's Supabase token. Row-level security
//   decides whether this person can see the lead (own lead or admin, 2-step sign-in), as in the Engine's deck.
// GET  /preview/<slug>  public, unlisted: the slug carries a random part, the page says it is a Plainline
//   concept preview, and search engines are told not to index it. Never on the business's own domain.
const crypto = require("crypto");
const { jsonBody } = require("./_public");
const { scanSite } = require("./studio-scan");
const { plan } = require("./studio-profile");
const Engine = require("../studio-engine.js");

const SB = process.env.SUPABASE_URL || "https://mtpaaizladkfjtpnkdao.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ORIGIN = process.env.PREVIEW_ORIGIN || "https://ops.plainlineops.com";
const SITE = process.env.PREVIEW_SITE || "https://plainlineops.com";
const REBUILD_MS = 5 * 60 * 1000; // a build takes up to ~4 minutes; no second paid build inside that window
const KEEP_DAYS = 30; // a preview link stops working 30 days after its last build (it shows a real business's name and photos)

async function rest(path, key, init = {}) {
  const r = await fetch(SB + path, { ...init, headers: { apikey: ANON || key, authorization: "Bearer " + key, "content-type": "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw Object.assign(new Error("supabase " + r.status), { status: r.status });
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const linkFor = slug => `${SITE}/preview/${slug}`;
// Business words plus 10 random characters: readable in a text, not guessable.
function newSlug(name) {
  const words = String(name || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).replace(/-$/, "");
  return (words.length >= 2 ? words : "site") + "-" + crypto.randomBytes(5).toString("hex"); // 40 random bits
}

function notFound(res) {
  res.status(404).setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.end('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Preview not found</title><body style="font-family:system-ui,sans-serif;padding:24px"><p>This preview isn\'t available. Ask whoever sent you the link for a new one.</p></body>');
}

async function show(req, res) {
  const slug = String((req.query && req.query.slug) || "");
  if (!/^[a-z0-9-]{12,60}$/.test(slug) || !SERVICE) return notFound(res);
  let row;
  try { [row] = await rest(`/rest/v1/ops_leads?preview_slug=eq.${slug}&select=preview_at,ops_previews(profile)&limit=1`, SERVICE, { method: "GET" }) || []; }
  catch { res.status(502).setHeader("Content-Type", "text/plain; charset=utf-8"); return res.end("The preview couldn't load. Try again in a minute."); }
  const profile = row && row.ops_previews && row.ops_previews.profile;
  if (!profile || Date.now() - new Date(row.preview_at).getTime() > KEEP_DAYS * 864e5) return notFound(res);
  // shared: the "Concept preview by Plainline · not the official site" bar, no owner link. Ben's planner
  // questions, to-dos and "ADD:" blanks are notes for him, so they stay off the page the owner sees.
  const blank = v => typeof v === "string" ? (/^\s*ADD:/i.test(v) ? "" : v) : Array.isArray(v) ? v.map(blank) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : v;
  const html = Engine.render(blank(Object.assign({}, profile, { questions: [], todos: [] })), { shared: true }).site;
  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300");
  res.end(html);
}

async function build(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const token = String(req.headers.authorization || "").replace(/^Bearer /, "");
  const b = jsonBody(req), id = String(b.id || "");
  if (!token || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: "Missing sign-in or lead id" });
  if (!process.env.ANTHROPIC_API_KEY || !SERVICE || !ANON) return res.status(501).json({ error: "Website previews aren't set up yet" });
  let lead;
  try { [lead] = await rest(`/rest/v1/ops_leads?id=eq.${id}&select=id,business,website,status,preview_slug,preview_at`, token, { method: "GET" }) || []; }
  catch (e) { return res.status(e.status === 401 ? 401 : 502).json({ error: e.status === 401 ? "Sign in again" : "Couldn't read the lead. Try again." }); }
  if (!lead) return res.status(404).json({ error: "Lead not found" });
  if (lead.status !== "approved") return res.status(409).json({ error: "Previews are for approved leads" });
  if (!lead.website) return res.status(422).json({ error: "Add the business's website to the lead first" });
  if (lead.preview_slug && !b.fresh) return res.status(200).json({ url: linkFor(lead.preview_slug), saved: lead.preview_at });
  // Claim the build, so a double tap or a second rep can't start a second paid build.
  const since = new Date(Date.now() - REBUILD_MS).toISOString();
  let claimed;
  try { claimed = await rest(`/rest/v1/ops_leads?id=eq.${id}&or=(preview_at.is.null,preview_at.lt.${since})&select=id`, SERVICE, { method: "PATCH", body: JSON.stringify({ preview_at: new Date().toISOString() }), headers: { prefer: "return=representation" } }); }
  catch { return res.status(502).json({ error: "Couldn't start the preview. Try again." }); }
  if (!claimed || !claimed.length) return res.status(429).json({ error: lead.preview_slug ? "A preview was just built. Wait five minutes to rebuild." : "This preview is already being built. Check again in a few minutes." });
  let profile;
  try { const scan = await scanSite(lead.website); profile = await plan({ scan }, undefined, 240_000); } // leaves time to save inside the 300 s limit
  catch (e) {
    // Give the claim back, so the rep can try again right away.
    await rest(`/rest/v1/ops_leads?id=eq.${id}`, SERVICE, { method: "PATCH", body: JSON.stringify({ preview_at: lead.preview_at }) }).catch(e2 => console.error("preview unclaim", e2.message));
    return res.status(e.upstream ? 502 : 422).json({ error: `Couldn't build the preview (${e.message}).` });
  }
  const slug = lead.preview_slug || newSlug(profile.business.name || lead.business); // a rebuild keeps the link already sent
  const at = new Date().toISOString();
  try {
    // The profile sits in its own table (only the server reads it), so lead lists don't download it.
    await rest("/rest/v1/ops_previews", SERVICE, { method: "POST", body: JSON.stringify({ lead_id: id, profile }), headers: { prefer: "resolution=merge-duplicates" } });
    await rest(`/rest/v1/ops_leads?id=eq.${id}`, SERVICE, { method: "PATCH", body: JSON.stringify({ preview_slug: slug, preview_at: at }) });
  }
  catch { return res.status(502).json({ error: "Built the preview but couldn't save it. Try again." }); }
  return res.status(200).json({ url: linkFor(slug), saved: at });
}

module.exports = async function handler(req, res) {
  if (req.method === "GET") return show(req, res);
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (req.headers.origin !== ORIGIN) return res.status(403).json({ error: "Only The Engine can build previews" });
  return build(req, res);
};
Object.assign(module.exports, { newSlug });
