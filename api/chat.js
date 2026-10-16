// Plainline Text Concierge — AI reply endpoint (Vercel serverless function).
// Uses Claude when ANTHROPIC_API_KEY is set in the Vercel project; otherwise
// returns 501 and the site falls back to its built-in replies. It also falls back when a
// visitor hits the per-IP limit (429) or the API call fails (502), e.g. when the key is out of credit.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_PROMPT_CHARS = 12000; // the demo's prompt is ~3-6k characters
const LIMIT = 30, WINDOW_MS = 60 * 60 * 1000; // AI replies per IP per hour
const hits = new Map(); // ip -> [count, windowStart]; per warm instance, so a soft cap (set a spend limit on the key too)

function overLimit(ip) {
  const now = Date.now(), h = hits.get(ip);
  if (!h || now - h[1] > WINDOW_MS) { hits.set(ip, [1, now]); return false; }
  return ++h[0] > LIMIT;
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
  const origin = req.headers.origin;
  if (origin && origin.replace(/^https?:\/\//, "") !== req.headers.host) return res.status(403).json({ error: "Wrong origin" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (overLimit(ip)) return res.status(429).json({ error: "Limit reached" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const prompt = body && typeof body.prompt === "string" ? body.prompt : "";
  if (!prompt || prompt.length > MAX_PROMPT_CHARS) return res.status(400).json({ error: "Bad prompt" });

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
    if (!result || typeof result.reply !== "string") return res.status(502).json({ error: "AI returned an unexpected reply" });
    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI request failed" });
  }
};
