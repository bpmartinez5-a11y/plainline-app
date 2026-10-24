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

// Optional sort step (Jev by TypeSafe AI). Off unless JEV_API_KEY is set in Vercel.
// Jev labels the customer's latest texts and says how likely it is that a person is needed.
// It can only ADD a hand-off on top of Claude's own judgment, never remove one, and any
// Jev failure is ignored so the chat works exactly as before.
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = process.env.JEV_MODEL || "jev-latest";
const NEEDS_PERSON_AT = Number(process.env.JEV_HANDOFF_AT || 0.6); // 0..1; lower = more hand-offs
const INTENTS = {
  book: "wants to book or check openings",
  question: "asks about prices, services, hours or policies",
  reschedule: "wants to move or cancel a booking",
  urgent: "pain, emergency or a safety problem",
  complaint: "upset, complaining, refund or billing dispute",
  person: "asks to talk to a person",
  other: "small talk or anything else"
};
const PERSON_INTENTS = new Set(["urgent", "complaint", "person"]);

async function jevSort(key, text) {
  try {
    const r = await fetch(JEV_URL, {
      method: "POST",
      headers: { "Authorization": "Bearer " + key, "content-type": "application/json" },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: text,
        questions: {
          intent: { type: "choice", instructions: "What is this customer texting a local business about?",
            criteria: Object.entries(INTENTS).map(([id, d]) => `${id}: ${d}`).join("\n") },
          needs_person: { type: "noul", instructions: "A staff member should step in personally instead of an automated assistant replying." }
        }
      }),
      signal: AbortSignal.timeout(4000)
    });
    if (!r.ok) { console.error("jev error", r.status, await r.text()); return null; }
    const a = (await r.json()).answers || {};
    let intent = a.intent && String(a.intent.choice || "").split(":")[0].trim();
    if (!INTENTS[intent]) intent = "other";
    const conf = Number(a.intent && a.intent.confidence);
    const needs = Number(a.needs_person && a.needs_person.noul);
    return {
      by: "jev",
      intent,
      confidence: Number.isFinite(conf) ? Math.round(conf * 100) / 100 : null,
      needsPerson: Number.isFinite(needs) ? Math.round(needs * 100) / 100 : null
    };
  } catch (e) { console.error("jev failed", e.message); return null; }
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

  const jevKey = process.env.JEV_API_KEY;
  if (req.method === "GET") return res.status(200).json({ ai: Boolean(key), sort: Boolean(key && jevKey) });
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
  const latest = body && typeof body.latest === "string" ? body.latest.slice(0, 2000) : "";
  const sorting = jevKey && latest ? jevSort(jevKey, latest) : Promise.resolve(null); // runs alongside Claude

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
    const sort = await sorting;
    if (sort && !result.handoff && (PERSON_INTENTS.has(sort.intent) || (sort.needsPerson ?? 0) >= NEEDS_PERSON_AT)) {
      result.handoff = true;
      result.handoffReason = "Sorted as: " + (PERSON_INTENTS.has(sort.intent) ? INTENTS[sort.intent] : "likely needs a person");
      result.reply = (sort.intent === "urgent" ? "If this is an emergency, please call 911. " : "Thanks for letting us know. ") +
        "Someone from our team will reply here shortly.";
      result.show = "none"; result.chips = [];
    }
    return res.status(200).json(sort ? { result, sort } : { result });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI request failed" });
  }
};
