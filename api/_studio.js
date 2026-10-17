// Shared by the Studio endpoints (files starting with _ are not routes on Vercel).
const crypto = require("crypto");

// Only Ben uses the Studio: every call carries the STUDIO_KEY set in Vercel.
function authorized(req, res) {
  const want = process.env.STUDIO_KEY;
  if (!want) { res.status(501).json({ error: "Studio is off: add STUDIO_KEY in Vercel" }); return false; }
  const got = String(req.headers["x-studio-key"] || "");
  const a = crypto.createHash("sha256").update(got).digest(), b = crypto.createHash("sha256").update(want).digest();
  if (!crypto.timingSafeEqual(a, b)) { res.status(401).json({ error: "Wrong Studio key" }); return false; }
  return true;
}

function body(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

module.exports = { authorized, body };
