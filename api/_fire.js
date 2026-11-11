// Starts the Event runner (a Claude Code scheduled task; jarvis routines/events.md) as soon as code saves an event,
// so a website request gets its reply in minutes instead of at the next briefing or sweep (Ben, Nov 11: "Do all 5").
// Only the kind word is sent, never anything a visitor typed. It stays off until Ben pastes the task's API token into
// Vercel as EVENT_FIRE_TOKEN. A fire that fails is logged and dropped: the clock runs still answer every request.
const ROUTINE = "trig_01QPPFmh4MwZEEjbd367YqaB"; // the Event runner's id is not a secret; its token is
const KINDS = new Set(["inquiry"]); // each kind has a row in events.md
const GAP_MS = 2 * 60 * 1000, DAILY = 6; // per warm instance: a flood starts a few runs, and the next clock run does the rest
let last = 0, day = "", count = 0;

async function fireEvent(kind, now = Date.now()) {
  const token = String(process.env.EVENT_FIRE_TOKEN || "").trim();
  if (!KINDS.has(kind) || !/^sk-ant-oat01-[\w-]{20,}$/.test(token)) return "off";
  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) { day = today; count = 0; }
  if (now - last < GAP_MS || count >= DAILY) return "capped";
  last = now; count++; // counted before the call, so a failing endpoint is not hit on every request
  try {
    const r = await fetch(`https://api.anthropic.com/v1/claude_code/routines/${ROUTINE}/fire`, {
      method: "POST", signal: AbortSignal.timeout(3000), body: JSON.stringify({ text: kind }),
      headers: { authorization: `Bearer ${token}`, "anthropic-version": "2023-06-01", "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "content-type": "application/json" } });
    if (r.ok) return "fired";
    console.error("event fire", kind, r.status); // the status only: a 401 means the token was deleted or regenerated
    return "failed";
  } catch (e) {
    console.error("event fire", kind, e.name);
    return "failed";
  }
}

module.exports = { fireEvent, _reset: () => { last = 0; day = ""; count = 0; } };
