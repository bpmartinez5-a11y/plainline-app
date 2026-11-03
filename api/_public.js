// Shared by the public AI endpoints (/api/chat and /api/walkthrough). Files starting with _ are not routes on Vercel.

// Only this site's own pages may call a public endpoint. Browsers always send Origin on a POST from fetch(),
// and Sec-Fetch-Site when they support it, so a missing Origin means a script, not the page.
function sameSite(req) {
  const origin = req.headers.origin;
  if (!origin || origin.replace(/^https?:\/\//, "") !== req.headers.host) return false;
  const site = req.headers["sec-fetch-site"];
  return !site || site === "same-origin";
}

const clientIp = req => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

// A per-IP and per-instance cap on AI replies, per hour. It lives per warm instance, so it's soft
// (the spend limit on the key is the real cap). Call it only for valid requests, right before Claude is called,
// so junk requests can't use up the budget. Per-IP first; the instance-wide count only moves when a request goes to Claude.
function limiter(perIp, perInstance, windowMs = 60 * 60 * 1000) {
  const hits = new Map(); // ip -> [count, windowStart]
  let total = [0, 0]; // [count, windowStart] across all IPs on this instance
  return function overLimit(ip) {
    const now = Date.now();
    if (hits.size > 5000) for (const [k, h] of hits) if (now - h[1] > windowMs) hits.delete(k); // drop expired windows only
    const h = hits.get(ip);
    if (!h || now - h[1] > windowMs) hits.set(ip, [1, now]);
    else if (++h[0] > perIp) return true;
    if (now - total[1] > windowMs) total = [0, now];
    return ++total[0] > perInstance;
  };
}

function jsonBody(req) {
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  return b && typeof b === "object" ? b : {};
}

module.exports = { sameSite, clientIp, limiter, jsonBody };
