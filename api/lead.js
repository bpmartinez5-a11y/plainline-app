// Walkthrough requests from plainlineops.com (the contact form and the walkthrough chat) go through here into the
// Supabase "leads" table, The Engine's Inquiries tab. The server key stays on Vercel. The browser can't write the
// table itself, so a script can't fill the database's hourly cap and lock out real visitors: each IP gets a few
// requests (here and in the Vercel firewall rule on /api/lead), and the database keeps a last-resort cap for everyone.
const { sameSite, clientIp, limiter, jsonBody } = require("./_public");
const { fireEvent } = require("./_fire"); // starts the Event runner, which sends the booking-link reply in minutes

const PROJECT = "mtpaaizladkfjtpnkdao"; // Plainline's Supabase project; any other URL in env is a setup mistake
const overLimit = limiter(3, 200); // requests per IP per hour; per warm instance per hour
const overDaily = limiter(6, 1000, 24 * 60 * 60 * 1000); // per IP per day
const EMAIL = /^\S+@\S+\.\S+$/; // the same check as the page

const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");

// The four columns the table takes, checked to the table's own limits. Null when the request isn't a real one.
function lead(b) {
  const name = str(b.name, 201), email = str(b.email, 321), message = str(b.message, 5001);
  const source = str(b.source, 50).replace(/[^\w .·\/-]/g, "") || "website";
  if (!name || name.length > 200 || email.length > 320 || !EMAIL.test(email) || message.length > 5000) return null;
  if (!/^website( chat)?( · |$)/.test(source)) return null; // only the site's own sources (lead-source.test.js)
  return { name, email, message: message || null, source };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  const url = process.env.SUPABASE_URL || "", key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !url.includes(PROJECT + ".supabase.co")) return res.status(501).json({ error: "Not configured" });
  if (!sameSite(req)) return res.status(403).json({ error: "Wrong origin" });
  const b = jsonBody(req);
  if (b.website) return res.status(200).json({ ok: true }); // a bot filled the hidden field: say thanks, save nothing
  const row = lead(b);
  if (!row) return res.status(400).json({ error: "Bad request" });
  const ip = clientIp(req);
  if (overLimit(ip) || overDaily(ip)) return res.status(429).json({ error: "Limit reached" });

  const headers = { apikey: key, "Content-Type": "application/json", Prefer: "return=minimal" };
  if (key.startsWith("eyJ")) headers.Authorization = "Bearer " + key; // the older service-role key is a JWT
  try {
    const r = await fetch(url.replace(/\/$/, "") + "/rest/v1/leads", { method: "POST", headers, body: JSON.stringify(row), signal: AbortSignal.timeout(10000) });
    if (r.ok) { await fireEvent("inquiry"); return res.status(200).json({ ok: true }); } // never fails the request (_fire.js)
    console.error("lead: supabase", r.status); // never the visitor's name, email or words
    return res.status(r.status === 400 && /too many inquiries/.test(await r.text()) ? 429 : 502).json({ error: "Save failed" });
  } catch (e) {
    console.error("lead failed", e.name);
    return res.status(502).json({ error: "Save failed" });
  }
};

module.exports._test = { lead };
