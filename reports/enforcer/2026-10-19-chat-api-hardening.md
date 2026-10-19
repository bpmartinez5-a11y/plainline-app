PASS

# Enforcer: /api/chat hardening (plainline-app, branch claude/chat-api-hardening)

Tier: **High** (`api/`). Diff: `api/chat.js` only, +40/−11. Run 2026-10-19 by the-enforcer, after a `security-auditor` review whose findings were each checked against the code.

## Findings

| Severity | Where | Why it matters | Fix |
|---|---|---|---|
| Medium (residual, not introduced) | `api/chat.js` `sameSite()` | Origin, Host and Sec-Fetch-Site are plain headers outside a browser, so a script can still spoof them. This change blocks other websites and naive scripts, not a determined caller. | Ops: set a monthly spend limit on the Anthropic key, and add a Vercel Firewall rate-limit rule on `/api/chat`. Code: move prompt-building server-side later (bigger demo change). |
| Medium (residual) | `api/chat.js` `looksLikeDemo()` | The template check is structural, so a caller who copies the template's frame can still put their own text inside. They get at most 300 output tokens on a Haiku-class model, and only the demo's 8 fields come back. | Same as above. The real cost cap is the key's spend limit. |
| Fixed in this change | `api/chat.js` `overLimit()` | An earlier draft counted rejected requests toward the shared budget, so junk traffic could switch the demo to built-in replies for everyone. | The limit now runs after validation, per-IP first, and the shared count moves only for requests that reach Claude. Regression test: 700 junk requests, then a real visitor gets 200. |
| Fixed in this change | `api/chat.js` `pick()` | The endpoint returned the model's whole JSON object. | It now returns only `reply, show, serviceId, date, chips, handoff, handoffReason, customerName` (the fields `demo.html` reads). |
| Low (pre-existing) | `api/chat.js` `console.error("anthropic error", …)` | Upstream error bodies are logged. They don't contain the key or visitor text, but they could include request IDs. | Acceptable. Keep the rule against logging visitor messages. |

No secrets in the diff or the changed file. No new dependency. No new data is collected or stored, so the privacy policy needs no change.

## Legal and compliance
- No change to what visitors see, the AI disclosure, data collection or terms. Nothing here needs a lawyer.
- Boundary: no Creative Planning data, client data or personal finance data is involved.

## What was checked
- Diff read in full. Secrets grep on the diff. The logging lines.
- 14 handler tests against a real `buildPrompt()` output captured from `demo.html` in a headless browser: same-site 200; a missing or foreign Origin 403; a cross-site fetch 403; an arbitrary or prefix-only prompt 400; an oversize prompt 400; an overlong reply 502; the per-IP limit 429 on call 31; junk traffic doesn't exhaust the shared budget; extra model keys are stripped.
- `node --check api/chat.js`.

## What wasn't checked
- Live behavior on Vercel production and preview. The tests mock Claude and the request headers.
- That Vercel overwrites `x-forwarded-for`. This relies on Vercel's documented behavior and wasn't tested.
- The built-in `/security-review` command, which isn't available in this session. The `security-auditor` subagent covered the same ground.
