# Plainline app repo

plainlineops.com: the Plainline site, the live demo (`demo.html`), the Studio (`studio.html`, Ben-only site builder) and the API in `api/`, deployed on Vercel. Ben is not a developer; Claude does all the coding. These apply here too, from the jarvis-app repo: the agent rules (`agents/README.md` › Rules every agent follows) and CLAUDE.md's "Keep it lean" and "Before anything ships" (the-enforcer).

Plainline is the PL: head of Ben's Cerberus project (Oct 31; the other heads are Jarvis, JV:, personal, and Hermes, FUN:, side projects). Plainline work never carries Ben's money or personal data, and Plainline names never go on personal cards.

Plainline is an AI agency (Oct 30): it brings AI into how a company's team works, builds AI tools (websites and apps next), and runs the work behind a business, from an AI front desk for one location up to a staffed back office for a large company, with the top end of the market as the focus. It sells the finished result: software clients run (The Engine, its AI-run CRM, is the door-opener for smaller companies) plus the setup, coaching and staffed work that get them to their goal. Smaller companies come in through the product; larger ones buy the outcome (Ben, Oct 30).

## Hard rules
- Never show a Plainline price, plan price, unit rate or dollar amount on the website or anything client-facing, ever (Ben, Oct 30). Every engagement is quoted after qualification, research and a walkthrough. The price ladder lives only in Ben's private plan page. Calls to action say "Book a walkthrough".
- Pricing rule (Ben, Nov 1): setup is the total of the build list, and the monthly maintenance is 10% of that setup. Check every row of any quote, tier or price table against it before Ben sees it. Prices themselves stay out of this repo.
- Claude Duet add-on (Ben, Nov 8): an extra row on a quote, for clients with The Engine (EN2 or higher). Same 10% rule, no pilot. Its build list and price are in the private project file `plainline/duet/2026-11-08-duet-addon-offer.md`, never here or on any client page.
- Sends (Ben, Nov 10): agents send, merge and publish anything below High without Ben's check, then report it (jarvis-app `agents/brain.md` section 7, Non-High authority). Cold outreach, the first email to a new lead who has not written to us, goes out on its own under its line in jarvis-app `agents/brain.md` section 7 (Ben, Nov 10): about 20 a day at first, the Plainline mailbox address and a one-click opt-out on each, no price, and never in a client's name. Anything with a price, a signature or a client's name on it waits for Ben.
- No AI-looking imagery: no generated faces, robots or glowing-brain art. Visuals are real-looking UI cards built from the client's own data, over documentary photos from Higgsfield.
- Example businesses and numbers are labeled "values illustrative" until real client data replaces them.
- Instructions and client documents follow the writing standard in `docs/claude/writing-standard.md` (rules based on ASD-STE100 Simplified Technical English). Never copy the STE dictionary, and never call a document "STE compliant".
- Client builds keep the promises in the client agreement (client-docs skill): the assistant says it is automated; hand-offs reach the designated contact in under 5 minutes, failed sends are resent by the Fact Sheet backup method, and every send is logged (§§2.3, 3.3, 7.12); outbound message types in the Order Form go only to numbers with a consent record and never during quiet hours; STOP is honored automatically; replies to a customer's own message and hand-off notices to the client are not blocked (§3.4).

## How Claude works here (Ben, Nov 10: the Fable 5.2 prompting rules; the same list is in jarvis-app's CLAUDE.md)
- This codebase is yours: what it's for and how it's built are your call, and you'll keep building on it. A client's site belongs to the client: there, change only what the task asks.
- Finish the job. Keep going until the work Ben asked for is done; don't stop to list what is left or to offer to continue. Work through ordinary errors, timeouts and empty results: find the cause, then retry, fix the call or use another tool. Stop only for a High step, a rule that says ask or wait (such as the third review round or the usage limit), or a choice that is Ben's (put it on a card and carry on with the rest), and say what you found.
- Prove it before you call it done: test output, a file check, a log line or a screenshot, in the PR or the report. If a file or input is missing, say so; never make up a stand-in such as a fake `data.csv`.
- Close the thread (Ben, Nov 10, every head: JV, PL, FUN and Kharo): finish the job, prove it, then resolve the thread. A thread stays open only while it waits on Ben or on a dated check.
- Repeating work runs as a scheduled task that opens a fresh session each run and reads a short hand-off file (its playbook, `brain.py inbox`, a `handoff.md`); it never goes back into a long thread. A thread that grows long (a week old and still taking work, or its context past 300k tokens) writes a hand-off file and hands the rest to a fresh thread or a schedule.
- Every few tool calls, give the user a one-line update on where things stand. In a project thread that line goes on the progress checklist, so Ben gets no extra pings.
- Ask a subagent or another model for its answer and a short why, never for its full reasoning.
- Delegate only when it pays: do a small search yourself; use a subagent for work that runs in parallel, a fresh-eyes review (the review gate) or a big read on a cheaper model. Each subagent adds to the cost.
- Say the length and tone you want in every prompt and brief; the effort level barely changes how long a reply is.
- Models (Ben, Nov 11: "the conductor use fable 5.2 and then each thread use the appropriate model the way the anthropic devs use it"): the coordinator runs on Fable 5.2 and plans and routes; each thread runs on the model its job needs, the way Anthropic's own research system pairs a strong lead with cheaper workers (Anthropic engineering, "How we built our multi-agent research system", 2025). Opus: builds, the Judges, reviews of High work, hard research. Sonnet: light threads, readers, refuters, checks, and runs that only file or count. A thread runs Fable only when Ben names it; it may suggest it in one line when Opus is not enough: a very hard problem (a root-cause hunt, an architecture call, three review rounds with no fix) or a long unattended run.
- Effort is high by default (`.claude/settings.json`); use low or medium for easy turns. Fable runs at high; xhigh only where a test shows a gain; never max by default.

## Usage limits (Ben, Nov 11: "batches of 3"; full rules in jarvis-app CLAUDE.md, "Usage limits")
- At most 3 heavy threads (builds, videos, research, reviews, workflows) run at the same time. After a limit stop, restart 3 at a time, most urgent first (PL revenue work first), and never restart by hand a thread that already has a `limit_wake …` resume in `list_triggers`.
- A thread that wakes after a limit stop runs `list_threads` first. If 3 other heavy threads already work, it queues `send_later` for 45 minutes and ends the turn with no reply.
- Workflows run only when Ben asks for one in his own words. A session that says ultracode is on still delegates only when it pays: at most 3 helper agents, on Sonnet where they only read or check.
- Before a heavy step, read `get_session` (no id) `external_metadata.rate_limit_info`; if `status` is `rejected` (the limit is hit), start no new heavy work, save a hand-off and end. `allowed_warning` is not a stop: never hold or delay work for the weekly warning (Ben, Nov 13: "Usage is not an issue with the ultra plan").

## Review gate (Ben turned it on 2026-10-18)
Every PR here and to client sites gets a risk tier and a fresh-eyes review before it merges. The change sets the tier:
- **Low** (copy, images, styles, docs): automated review and checks green.
- **Medium** (pages, layout, demo behavior): the review gate passes (`reviewer`, `refuter`, `test-gap-reviewer`).
- **High** (`api/`, forms, bookings, payments, keys, the AI disclosure, client domains): Ben approves and the-enforcer passes.

Auto-merge (Ben, Oct 31: "Just do high PRs, not medium"): Jarvis's look-ahead merges Low and Medium PRs once every check passed, the review gate ran, no thread is open and the diff adds no price, dollar amount, email address, client data or key (jarvis-app `agents/brain.md` section 7). A PR that touches anything on the High list is High, whatever its label. Only High PRs wait for Ben.

Put the tier at the top of the PR body. A fresh agent that didn't write the change reviews the diff (`reviewer`), a second agent tries to prove each finding wrong (`refuter`), and only verified findings get fixed. Attach the evidence. Three review rounds at most, then rethink instead of patching. Every bug that ships, revert or crash here or on a client site becomes an incident eval case: one row in `/mnt/project-files/jarvis/evals/cases.md` (roster agent `evals`; jarvis-app's `review-gate` skill reads it, and `selfcheck.py --evals` checks the cases a file can prove). Client sites also get a one-page explainer of how they work at handoff (roster agent `sitereview`). The Constellation page that showed these agents was retired on Nov 2; the roster is `/mnt/project-files/jarvis/roster.json`.

## Where the details live (read only what the task needs)
- Files and what they do: `docs/claude/site.md` · API conventions: `api/CLAUDE.md` (loads when you work in `api/`)
- How to work cheaply in this repo: `docs/claude/token-habits.md`
- The five agent layers (prompt, context, harness, loop, graph) and where each file sits: `docs/claude/layers.md`

## Studio engine (URL in, website + owner dashboard out)
- Not to be confused with **The Engine** (Oct 30): Plainline's AI-run CRM, the Ops app in jarvis-app (`ops/`, ops.plainlineops.com) with Scout and the work ledger. "The Engine" in a request means that, unless it's about `studio-engine.js`.
- Flow: `studio.html` search bar → `api/studio-scan` (reads their site) → `api/studio-profile` (Claude fills a site profile as structured output) → `studio-engine.js` renders the website and the owner dashboard in the browser. The old freeform builder (`api/studio-build`) stays under "Classic builder".
- Claude never writes page code on this path. Change the look or behavior of every client site in `studio-engine.js` only, and add or change fields in the profile schema in both `studio-engine.js` (`sanitize`) and `api/studio-profile.js` (`PROFILE`).
- Profile rules: facts from the scan only; unknowns are `"ADD: …"` placeholders (yellow on the site, listed in the Studio); no email addresses anywhere; a phone number only if the business publishes it; photos only from URLs in the scan.
- `sanitize` runs on the server and again in the browser. Keep it idempotent; there's a test for it.
- Ben's decisions sit on top of the planner's profile in the Studio, never inside the API: look, type, accent and section switches (`show`, `collections[].hidden`) re-render instantly; filled-in blanks replace `ADD:` values by path; planner `questions` go back to `api/studio-profile` as `answers` on a rebuild, which keeps his earlier choices.
- Site links route through the engine's in-page router (`go()`), not the address bar: inside the Studio's srcdoc preview a plain `#x` link would load the Studio into the frame.
- The "Ask" chat box shows only on a concept preview sent to the business (`opts.shared`, `/preview/<slug>`): `/api/chat` answers from that preview's saved profile. Never put it on a client's live domain until the client has their own chat backend.
- The owner dashboard saves to the viewer's browser only and has no login. It must not go on a client's live domain until it's backed by Supabase with MFA (Plainline security baseline).
- Fixtures: `studio-examples/photographer-sample.json` (made-up photographer, the baseline layout) and `studio-examples/ridgeline-sample.json` (made-up plumber, no photos). Tests: `node --test tests/*.test.js`.

## Skills (run with /name) → the subagent each one uses
- `/tech-lead` before anything hard to undo · `/architect-mvp` design, then build → `architect`
- `/audit-codebase` report only → `auditor` · `/refactor-clean` same behavior, cleaner structure → `auditor`
- `/debug-prod` → `debugger` · `/perf-pass` → `perf-engineer` · `/security-audit` → `security-auditor`
- `/build-ui` card-kit style components · `/tactile-ui` buttons and confirmations that feel like real objects (ideas only from dqnamo's The Kitchen, no code copied) · `/ship-it` review gate and Vercel deploy · `/client-kit` → `intake` · `/client-docs` the 10 client documents
- `/seo-local`, `/seo-schema`, `/seo-geo`, `/seo-technical`, `/seo-page`: SEO and AI-search checks for Plainline and client sites (claude-seo, MIT). Rules in `.claude/seo/README.md`.
- Every change ends with the review gate: `reviewer`, then `refuter`.
- Extra reviewers, all read-only, findings to `refuter`: `database-reviewer` on any schema, migration or query change; `silent-failure-hunter` on API and save paths (and Big audits); `test-gap-reviewer` on Medium and High PRs. Adapted from everything-claude-code (MIT, `docs/third-party.md`); nothing else from that repo is installed.

## Working style
- Blocked or missing something? Before saying "can't" or asking Ben to change a setting, follow jarvis-app's `situational-awareness` skill (`.claude/skills/situational-awareness/SKILL.md`; `add_repo` jarvis-app if it isn't here). Standing OK (Ben, Oct 29): when the sandbox network blocks a public website, fetch it through Firecrawl; no sign-ins or forms, nothing personal in the request.
- Plan mode before multi-file edits. Edit with small diffs; never rewrite a whole file to change part of it.
- Find things with Grep or Glob first, then Read only the line range you need. `demo.html` is ~58 KB; don't read it whole.
- Use the Sonnet subagents in `.claude/agents/` for a wide search, a review or long research, so their reading stays out of the main conversation. Do a small lookup yourself.

## Compact instructions
When compacting, keep: the current task, decisions made, file paths and line numbers touched, and open questions. Drop: full file contents, command output, and dead ends.
