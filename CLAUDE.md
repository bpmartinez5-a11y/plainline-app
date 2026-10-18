# Plainline app repo

plainlineops.com: the Plainline site, the live demo (`demo.html`) and the API in `api/`, deployed on Vercel. Ben is not a developer; Claude does all the coding. The agent rules, the lean-code rules and the-enforcer step live in the jarvis-app repo's CLAUDE.md and apply here too.

## Review gate (Ben turned it on 2026-10-18)
Every PR here and to client sites gets a risk tier and a fresh-eyes review before it merges. The change sets the tier:
- **Low** (copy, images, styles, docs): automated review and checks green. Ben still merges until he promotes low-tier to auto-merge.
- **Medium** (pages, layout, demo behavior): Ben approves.
- **High** (`api/`, forms, bookings, payments, keys, the AI disclosure, client domains): Ben approves and the-enforcer passes.

Put the tier at the top of the PR body. A fresh agent that didn't write the change reviews the diff, a second agent tries to prove each finding wrong, and only verified findings get fixed. Attach the evidence. Three review rounds at most, then rethink instead of patching. Client sites also get a one-page explainer of how they work at handoff (Constellation star `sitereview`).
