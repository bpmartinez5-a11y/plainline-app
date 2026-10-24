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

// Optional sort step (Jev by TypeSafe AI). Off unless JEV_API_KEY is set in Vercel.
// Jev labels the customer's latest texts and scores whether a person is needed. It runs alongside the
// Claude call, can only ADD a hand-off on top of Claude's own judgment (never remove one), and any Jev
// failure is ignored so the demo works exactly as before. TypeSafe is a sub-processor: see docs/subprocessors.md.
const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = process.env.JEV_MODEL || "jev-latest";
const handoffAt = Number(process.env.JEV_HANDOFF_AT); // 0..1; lower = more hand-offs
const NEEDS_PERSON_AT = Number.isFinite(handoffAt) && handoffAt > 0 && handoffAt <= 1 ? handoffAt : 0.6;
const MAX_LATEST_CHARS = 2000; // the last three customer texts
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
    if (!r.ok) { console.error("jev error", r.status); return null; } // status only: the body may echo the visitor's text
    const a = (await r.json()).answers || {};
    let intent = a.intent && String(a.intent.choice || "").split(":")[0].trim().toLowerCase();
    if (!Object.hasOwn(INTENTS, intent)) intent = "other";
    const conf = Number(a.intent && a.intent.confidence);
    const needs = Number(a.needs_person && a.needs_person.noul);
    return {
      by: "jev",
      intent,
      confidence: Number.isFinite(conf) ? Math.round(conf * 100) / 100 : null,
      needsPerson: Number.isFinite(needs) ? Math.round(needs * 100) / 100 : null
    };
  } catch (e) { console.error("jev failed", e.name); return null; }
}

// Sorting can only add a hand-off. Urgent replies point to 911 first. Any urgent-looking intent hands off
// whatever its confidence: a needless hand-off costs a staff glance, a missed emergency costs far more.
function applySort(result, sort) {
  if (!sort) return result;
  if (result.handoff) {
    if (sort.intent === "urgent" && !/911/.test(result.reply)) return { ...result, reply: "If this is an emergency, please call 911. " + result.reply };
    return result;
  }
  if (!PERSON_INTENTS.has(sort.intent) && (sort.needsPerson ?? 0) < NEEDS_PERSON_AT) return result;
  return {
    ...result,
    handoff: true,
    handoffReason: "Sorted as: " + (PERSON_INTENTS.has(sort.intent) ? INTENTS[sort.intent] : "likely needs a person"),
    reply: (sort.intent === "urgent" ? "If this is an emergency, please call 911. " : "Thanks for letting us know. ") +
      "Someone from our team will reply here shortly.",
    show: "none",
    chips: [],
    serviceId: null,
    date: null
  };
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
  const jevKey = process.env.JEV_API_KEY;
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
  const latest = body && typeof body.latest === "string" ? body.latest.slice(0, MAX_LATEST_CHARS) : "";
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
    if (!result || typeof result.reply !== "string" || result.reply.length > MAX_REPLY_CHARS) return res.status(502).json({ error: "AI returned an unexpected reply" });
    const sort = await sorting;
    const out = pick(applySort(result, sort));
    return res.status(200).json(sort ? { result: out, sort } : { result: out });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI request failed" });
  }
};
