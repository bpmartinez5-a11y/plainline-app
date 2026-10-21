---
name: architect-mvp
description: "Design the system first, then build the smallest version that works and can grow without a rewrite. Use for a new product, feature or backend (e.g. the owner app, client booking, multi-client hosting). Covers architecture, file structure, data model, API, UI and caching."
---
# Architect, then build the MVP

1. **Clarify.** Ask at most 3 questions about who uses it, what "done" looks like, and anything that can't change. Skip a question when the answer is already in the request or in `CLAUDE.md`.
2. **Design.** Hand the feature to the `architect` subagent. It returns architecture, file structure, data model, endpoints, UI states, caching, tradeoffs and build order.
3. **Check the design.**
   - Does it break a hard rule (no Plainline prices, no AI-looking imagery)?
   - Does it add a service, dependency or monthly cost? List each one for Ben. If a new service will receive client or customer data, add it to `docs/subprocessors.md` and get Ben's client notice out at least 15 days before it goes live (agreement §7.7).
   - Is anything there "for scale" that this month's traffic doesn't need? Cut it.
4. **Show Ben the plan** (in plan mode) and wait for a yes before editing.
5. **Build in the architect's order**, one small step at a time:
   - New endpoints go in `api/<name>.js` and follow `api/CLAUDE.md`: status codes, env vars, auth (`_studio.js` for Ben-only routes), no secrets in logs.
   - Edit existing files with small diffs. Find the spot with Grep before reading.
   - Every UI gets loading, empty and error states, and works at 400px wide.
6. **Verify.** Run `node --check` on changed JS, open the page at 400px, then run the review gate (`reviewer`, then `refuter`). For anything in `api/` (High tier), also run `security-auditor`, and the-enforcer before merge.
7. **Report.** Summarize what was built, what was deliberately left out, and the next step.
