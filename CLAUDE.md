# Plainline app repo

plainlineops.com: the Plainline site, the live demo (`demo.html`), the Studio (`studio.html`, Ben-only site builder) and the API in `api/`, deployed on Vercel. Ben is not a developer; Claude does all the coding. These apply here too, from the jarvis-app repo: the agent rules (`agents/README.md` › Rules every agent follows) and CLAUDE.md's "Keep it lean" and "Before anything ships" (the-enforcer).

Plainline is an AI agency (Oct 30): it brings AI into how a company's team works, builds AI tools (websites and apps next), and runs the work behind a business, from an AI front desk for one location up to a staffed back office for a large company, with the top end of the market as the focus. It sells finished work, not software seats.

## Hard rules
- Never show a Plainline price, plan price, unit rate or dollar amount on the website or anything client-facing, ever (Ben, Oct 30). Every engagement is quoted after qualification, research and a walkthrough. The price ladder lives only in Ben's private plan page. Calls to action say "Book a walkthrough".
- No AI-looking imagery: no generated faces, robots or glowing-brain art. Visuals are real-looking UI cards built from the client's own data, over documentary photos from Higgsfield.
- Example businesses and numbers are labeled "values illustrative" until real client data replaces them.
- Instructions and client documents follow the writing standard in `docs/claude/writing-standard.md` (rules based on ASD-STE100 Simplified Technical English). Never copy the STE dictionary, and never call a document "STE compliant".
- Client builds keep the promises in the client agreement (client-docs skill): the assistant says it is automated; hand-offs reach the designated contact in under 5 minutes, failed sends are resent by the Fact Sheet backup method, and every send is logged (§§2.3, 3.3, 7.12); outbound message types in the Order Form go only to numbers with a consent record and never during quiet hours; STOP is honored automatically; replies to a customer's own message and hand-off notices to the client are not blocked (§3.4).

## Review gate (Ben turned it on 2026-10-18)
Every PR here and to client sites gets a risk tier and a fresh-eyes review before it merges. The change sets the tier:
- **Low** (copy, images, styles, docs): automated review and checks green. Ben still merges until he promotes low-tier to auto-merge.
- **Medium** (pages, layout, demo behavior): Ben approves.
- **High** (`api/`, forms, bookings, payments, keys, the AI disclosure, client domains): Ben approves and the-enforcer passes.

Put the tier at the top of the PR body. A fresh agent that didn't write the change reviews the diff (`reviewer`), a second agent tries to prove each finding wrong (`refuter`), and only verified findings get fixed. Attach the evidence. Three review rounds at most, then rethink instead of patching. Every bug that ships, revert or crash here or on a client site becomes an incident eval case (Constellation star `evals`). Client sites also get a one-page explainer of how they work at handoff (Constellation star `sitereview`).

## Where the details live (read only what the task needs)
- Files and what they do: `docs/claude/site.md` · API conventions: `api/CLAUDE.md` (loads when you work in `api/`)
- How to work cheaply in this repo: `docs/claude/token-habits.md`

## Studio engine (URL in, website + owner dashboard out)
- Not to be confused with **The Engine** (Oct 30): Plainline's AI-run CRM, the Ops app in jarvis-app (`ops/`, ops.plainlineops.com) with Scout and the work ledger. "The Engine" in a request means that, unless it's about `studio-engine.js`.
- Flow: `studio.html` search bar → `api/studio-scan` (reads their site) → `api/studio-profile` (Claude fills a site profile through one tool call) → `studio-engine.js` renders the website and the owner dashboard in the browser. The old freeform builder (`api/studio-build`) stays under "Classic builder".
- Claude never writes page code on this path. Change the look or behavior of every client site in `studio-engine.js` only, and add or change fields in the profile schema in both `studio-engine.js` (`sanitize`) and `api/studio-profile.js` (`TOOL`).
- Profile rules: facts from the scan only; unknowns are `"ADD: …"` placeholders (yellow on the site, listed in the Studio); no email addresses anywhere; a phone number only if the business publishes it; photos only from URLs in the scan.
- `sanitize` runs on the server and again in the browser. Keep it idempotent; there's a test for it.
- Ben's decisions sit on top of the planner's profile in the Studio, never inside the API: look, type, accent and section switches (`show`, `collections[].hidden`) re-render instantly; filled-in blanks replace `ADD:` values by path; planner `questions` go back to `api/studio-profile` as `answers` on a rebuild, which keeps his earlier choices.
- Site links route through the engine's in-page router (`go()`), not the address bar: inside the Studio's srcdoc preview a plain `#x` link would load the Studio into the frame.
- The owner dashboard saves to the viewer's browser only and has no login. It must not go on a client's live domain until it's backed by Supabase with MFA (Plainline security baseline).
- Fixtures: `studio-examples/photographer-sample.json` (made-up photographer, the baseline layout) and `studio-examples/ridgeline-sample.json` (made-up plumber, no photos). Tests: `node --test tests/*.test.js`.

## Skills (run with /name) → the subagent each one uses
- `/tech-lead` before anything hard to undo · `/architect-mvp` design, then build → `architect`
- `/audit-codebase` report only → `auditor` · `/refactor-clean` same behavior, cleaner structure → `auditor`
- `/debug-prod` → `debugger` · `/perf-pass` → `perf-engineer` · `/security-audit` → `security-auditor`
- `/build-ui` card-kit style components · `/ship-it` review gate and Vercel deploy · `/client-kit` → `intake` · `/client-docs` the 10 client documents
- Every change ends with the review gate: `reviewer`, then `refuter`.

## Working style
- Blocked or missing something? Before saying "can't" or asking Ben to change a setting, follow jarvis-app's `situational-awareness` skill (`.claude/skills/situational-awareness/SKILL.md`; `add_repo` jarvis-app if it isn't here). Standing OK (Ben, Oct 29): when the sandbox network blocks a public website, fetch it through Firecrawl; no sign-ins or forms, nothing personal in the request.
- Plan mode before multi-file edits. Edit with small diffs; never rewrite a whole file to change part of it.
- Find things with Grep or Glob first, then Read only the line range you need. `demo.html` is ~58 KB; don't read it whole.
- Hand searches, reviews and research to the Sonnet subagents in `.claude/agents/`.

## Compact instructions
When compacting, keep: the current task, decisions made, file paths and line numbers touched, and open questions. Drop: full file contents, command output, and dead ends.
