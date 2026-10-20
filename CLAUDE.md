# Plainline app repo

plainlineops.com: the Plainline site, the live demo (`demo.html`), the Studio (`studio.html`, Ben-only site builder) and the API in `api/`, deployed on Vercel. Ben is not a developer; Claude does all the coding. These apply here too, from the jarvis-app repo: the agent rules (`agents/README.md` › Rules every agent follows) and CLAUDE.md's "Keep it lean" and "Before anything ships" (the-enforcer).

Plainline sells finished jobs to local businesses (every customer answered, the calendar filled). It doesn't sell software.

## Hard rules
- Never show a Plainline price, plan price or dollar amount on anything client-facing. Ben prices each client after a walkthrough. Calls to action say "Book a walkthrough".
- No AI-looking imagery: no generated faces, robots or glowing-brain art. Visuals are real-looking UI cards built from the client's own data, over documentary photos from Higgsfield.
- Example businesses and numbers are labeled "values illustrative" until real client data replaces them.

## Review gate (Ben turned it on 2026-10-18)
Every PR here and to client sites gets a risk tier and a fresh-eyes review before it merges. The change sets the tier:
- **Low** (copy, images, styles, docs): automated review and checks green. Ben still merges until he promotes low-tier to auto-merge.
- **Medium** (pages, layout, demo behavior): Ben approves.
- **High** (`api/`, forms, bookings, payments, keys, the AI disclosure, client domains): Ben approves and the-enforcer passes.

Put the tier at the top of the PR body. A fresh agent that didn't write the change reviews the diff (`reviewer`), a second agent tries to prove each finding wrong (`refuter`), and only verified findings get fixed. Attach the evidence. Three review rounds at most, then rethink instead of patching. Every bug that ships, revert or crash here or on a client site becomes an incident eval case (Constellation star `evals`). Client sites also get a one-page explainer of how they work at handoff (Constellation star `sitereview`).

## Where the details live (read only what the task needs)
- Files and what they do: `docs/claude/site.md` · API conventions: `api/CLAUDE.md` (loads when you work in `api/`)
- How to work cheaply in this repo: `docs/claude/token-habits.md`

## Skills (run with /name) → the subagent each one uses
- `/tech-lead` before anything hard to undo · `/architect-mvp` design, then build → `architect`
- `/audit-codebase` report only → `auditor` · `/refactor-clean` same behavior, cleaner structure → `auditor`
- `/debug-prod` → `debugger` · `/perf-pass` → `perf-engineer` · `/security-audit` → `security-auditor`
- `/build-ui` card-kit style components · `/ship-it` review gate and Vercel deploy · `/client-kit` → `intake` · `/client-docs` the 10 client documents
- Every change ends with the review gate: `reviewer`, then `refuter`.

## Working style
- Plan mode before multi-file edits. Edit with small diffs; never rewrite a whole file to change part of it.
- Find things with Grep or Glob first, then Read only the line range you need. `demo.html` is ~58 KB; don't read it whole.
- Hand searches, reviews and research to the Sonnet subagents in `.claude/agents/`.

## Compact instructions
When compacting, keep: the current task, decisions made, file paths and line numbers touched, and open questions. Drop: full file contents, command output, and dead ends.
