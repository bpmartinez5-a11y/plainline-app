// Walkthrough requests from plainlineops.com (the contact form and the walkthrough chat) go through here into the
// Supabase "leads" table, The Engine's Inquiries tab. The server key stays on Vercel. The browser can't write the
// table itself, so a script can't fill the database's hourly cap and lock out real visitors: each IP gets a few
// requests (here and in the Vercel firewall rule on /api/lead), and the database keeps a last-resort cap for everyone.
const { sameSite, clientIp, limiter, jsonBody } = require("./_public");
const { fireEvent } = require("./_fire"); // starts the Event runner, which sends the booking-link reply in minutes
const { qualify } = require("../qualify.js"); // the same rules the page uses: fit, check or not a fit
const ENGINE = "https://ops.plainlineops.com/api/check"; // The Engine's phone alerts (jarvis-app ops/api/check.js, pushInquiries)

const PROJECT = "mtpaaizladkfjtpnkdao"; // Plainline's Supabase project; any other URL in env is a setup mistake
const overLimit = limiter(3, 200); // requests per IP per hour; per warm instance per hour
const overDaily = limiter(6, 1000, 24 * 60 * 60 * 1000); // per IP per day
const EMAIL = /^\S+@\S+\.\S+$/; // the same check as the page

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// The four columns the table takes, checked to the table's own limits, plus `fit` (not saved). Null when the request
// isn't a real one. A walkthrough request (the form or the chat) is qualified: its message starts with the "Fit:",
// "Answers:", "Company:", "Phone:" and "Website:" lines from qualify.js, then the visitor's words. The seller page's
// answers are not.
function lead(b) {
  const name = str(b.name, 201), email = str(b.email, 321), message = str(b.message, 5001);
  const source = str(b.source, 50).replace(/[^\w .·\/-]/g, "") || "website";
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email) || message.length > 5000) return null;
  if (!/^website( chat)?( · |$)/.test(source)) return null; // only the site's own sources (lead-source.test.js)
  if (source === "website · sellers" && !b.q) return { name, email, message: message || null, source };
  const q = qualify(b.q, { company: b.company, phone: b.phone, site: b.site, nosite: b.nosite });
  return { name, email, message: (message ? q.line + "\n\n" + message : q.line).slice(0, 5000), source, fit: q.fit };
}

// Tells The Engine a request came in, so Ben's phone gets an alert in seconds (Ben, Nov 13: "yep let's get them").
// Only the word "inquiries" goes; The Engine reads the new row itself and alerts once per row. Never fails the request.
async function alertEngine() {
  try {
    const r = await fetch(ENGINE, { method: "POST", headers: { "content-type": "application/json" }, body: '{"push":"inquiries"}', signal: AbortSignal.timeout(3000) });
    if (!r.ok) console.error("engine alert", r.status);
  } catch (e) { console.error("engine alert", e.name); }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const url = process.env.SUPABASE_URL || "", key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !url.includes(PROJECT + ".supabase.co")) return res.status(501).json({ error: "Not configured" });
  if (!sameSite(req)) return res.status(403).json({ error: "Wrong origin" });
  const b = jsonBody(req);
  if (b.website) return res.status(200).json({ ok: true }); // a bot filled the hidden field: say thanks, save nothing
  const checked = lead(b);
  if (!checked) return res.status(400).json({ error: "Bad request" });
  const { fit, ...row } = checked;
  const ip = clientIp(req);
  if (overLimit(ip) || overDaily(ip)) return res.status(429).json({ error: "Limit reached" });

  const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key; // the older service-role key is a JWT
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/leads", { method: "POST", headers, body: JSON.stringify(row), signal: AbortSignal.timeout(10000) });
    if (r.ok) { // the page shows the booking page only for a fit; a request that is not a fit starts no agent and pings no phone
      if (fit !== "no") await Promise.all([fireEvent("inquiry"), alertEngine()]); // neither fails the request
      return res.status(200).json(fit ? { ok: true, fit } : { ok: true });
    }
    console.error("lead: supabase", r.status); // never the visitor's name, email or words
    return res.status(r.status === 400 && /too many inquiries/.test(await r.text()) ? 429 : 502).json({ error: "Save failed" });
  } catch (e) {
    console.error("lead failed", e.name);
    return res.status(502).json({ error: "Save failed" });
  }
};

module.exports._test = { lead };
