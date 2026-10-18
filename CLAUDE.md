# Plainline app repo

plainlineops.com: the Plainline site, the live demo (`demo.html`) and the API in `api/`, deployed on Vercel. Ben is not a developer; Claude does all the coding. These apply here too, from the jarvis-app repo: the agent rules (`agents/README.md` › Rules every agent follows) and CLAUDE.md's "Keep it lean" and "Before anything ships" (the-enforcer).

## Review gate (Ben turned it on 2026-10-18)
Every PR here and to client sites gets a risk tier and a fresh-eyes review before it merges. The change sets the tier:
- **Low** (copy, images, styles, docs): automated review and checks green. Ben still merges until he promotes low-tier to auto-merge.
- **Medium** (pages, layout, demo behavior): Ben approves.
- **High** (`api/`, forms, bookings, payments, keys, the AI disclosure, client domains): Ben approves and the-enforcer passes.

Put the tier at the top of the PR body. A fresh agent that didn't write the change reviews the diff, a second agent tries to prove each finding wrong, and only verified findings get fixed. Attach the evidence. Three review rounds at most, then rethink instead of patching. Every bug that ships, revert or crash here or on a client site becomes an incident eval case (Constellation star `evals`). Client sites also get a one-page explainer of how they work at handoff (Constellation star `sitereview`).
