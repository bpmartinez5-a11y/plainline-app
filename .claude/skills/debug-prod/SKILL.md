---
name: debug-prod
description: "Production-style debugging for a bug on the live site, the demo or the API. Reproduce it, find the real root cause, list edge cases, apply the smallest robust fix, and verify. No guessing."
---
# Debug like it's an outage

1. **Collect the facts.** What broke, where (URL or page, device), when it started, and the exact error or screenshot. If there's a Vercel deployment, check its runtime logs if the Vercel tools are available.
2. **Investigate.** Run the `debugger` subagent with those facts. It returns the breakdown, root cause, why it fails, edge cases, a proposed diff and how to verify.
3. **Check the diagnosis.** If the root cause isn't backed by a file:line or a reproduced failure, send it back with what's missing. Don't patch on a guess.
4. **Fix.** Apply the diff as a small edit. Keep the demo's fallbacks working: 501 and 429 switch it to built-in replies, and a 502 falls back for that one reply, so the demo keeps replying even when AI is down.
5. **Review.** Run the review gate (`reviewer`, then `refuter`). A fix in `api/` is High tier, so the-enforcer runs before merge.
6. **Verify.** Re-run the reproduction, run `node --check` on changed JS, and walk the edge cases the debugger listed.
7. **Report.** Give the root cause in one sentence, what changed, how it was verified, and any follow-up (such as a test or alert). If the bug reached production, add it as an incident eval case (Constellation star `evals`). If client or customer data may have been exposed, put a needsBen card in Ben's inbox within the hour: the client agreement (§7.11) requires notice to the client within 72 hours of a suspected incident.
