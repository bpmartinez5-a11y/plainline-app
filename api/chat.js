// Plainline Text Concierge — AI reply endpoint (Vercel serverless function).
// Uses Claude when ANTHROPIC_API_KEY is set in the Vercel project; otherwise
// returns 501 and the site falls back to its built-in replies. It also falls back when a
// visitor hits the per-IP limit (429) or the API call fails (502), e.g. when the key is out of credit.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_PROMPT_CHARS = 12000; // the demo's prompt is ~3-6k characters
const LIMIT = 30, WINDOW_MS = 60 * 60 * 1000; // AI replies per IP per hour
const GLOBAL_LIMIT = 600; // AI replies per warm instance per hour, all visitors combined: caps a spike from many IPs
const MAX_REPLY_CHARS = 600; // the demo asks for under 280; anything far longer isn't a booking text
const hits = new Map(); // ip -> [count, windowStart]; per warm instance, so a soft cap (set a spend limit on the key too)
let total = [0, 0]; // [count, windowStart] across all IPs on this instance

// Called only for valid demo requests, right before Claude is called, so junk requests can't use up the budget.
// Per-IP first; the instance-wide count only moves when a request is actually going to Claude.
function overLimit(ip) {
  const now = Date.now();
  if (hits.size > 5000) for (const [k, h] of hits) if (now - h[1] > WINDOW_MS) hits.delete(k); // drop expired windows only
  const h = hits.get(ip);
  if (!h || now - h[1] > WINDOW_MS) hits.set(ip, [1, now]);
  else if (++h[0] > LIMIT) return true;
  if (now - total[1] > WINDOW_MS) total = [0, now];
  return ++total[0] > GLOBAL_LIMIT;
}

// Return only the fields demo.html reads, so the endpoint can't hand back arbitrary model output.
const FIELDS = ["reply", "show", "serviceId", "date", "chips", "handoff", "handoffReason", "customerName"];
const pick = o => Object.fromEntries(FIELDS.filter(k => k in o).map(k => [k, o[k]]));

// Only this site's own pages may call the endpoint. Browsers always send Origin on a POST from fetch(),
// and Sec-Fetch-Site when they support it, so a missing Origin means a script, not the demo.
function sameSite(req) {
  const origin = req.headers.origin;
  if (!origin || origin.replace(/^https?:\/\//, "") !== req.headers.host) return false;
  const site = req.headers["sec-fetch-site"];
  return !site || site === "same-origin";
}

// The demo's prompt always comes from buildPrompt() in demo.html. Reject anything that isn't that template,
// so the endpoint can't be used as a general-purpose Claude proxy.
function looksLikeDemo(prompt) {
  return prompt.startsWith("You are the text-message booking assistant for ")
    && prompt.includes("\nCONVERSATION SO FAR\n")
    && prompt.trimEnd().endsWith('"customerName": string | null}');
}

function parseJson(text) {
  try { return JSON.parse(text); } catch {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch {} }
  return null;
}

module.exports = async function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ ai: Boolean(key) });
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!key) return res.status(501).json({ error: "AI not configured" });
  if (!sameSite(req)) return res.status(403).json({ error: "Wrong origin" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = body && typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt || prompt.length > MAX_PROMPT_CHARS || !looksLikeDemo(prompt)) return res.status(400).json({ error: "Bad prompt" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (overLimit(ip)) return res.status(429).json({ error: "Limit reached" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: "You are a business's text-message booking assistant. Reply with exactly one JSON object and nothing else.",
        messages: [{ role: "user", content: prompt }]
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!r.ok) {
      console.error("anthropic error", r.status, await r.text());
      return res.status(502).json({ error: "AI request failed" });
    }
    const data = await r.json();
    const text = (data.content || []).filter(p => p.type === "text").map(p => p.text).join("");
    const result = parseJson(text);
    if (!result || typeof result.reply !== "string" || result.reply.length > MAX_REPLY_CHARS) return res.status(502).json({ error: "AI returned an unexpected reply" });
    return res.status(200).json({ result: pick(result) });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI request failed" });
  }
};
