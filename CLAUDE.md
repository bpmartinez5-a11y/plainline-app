# Plainline

Plainline sells finished jobs to local businesses (answering every customer, booking the calendar). It doesn't sell software. This repo is the marketing site (`index.html`), the live text-booking demo (`demo.html`) and the AI reply endpoint (`api/chat.js`), deployed on Vercel.

## Hard rules
- Never show a Plainline price, plan price or dollar amount on anything client-facing. Ben prices each client after a walkthrough. Calls to action say "Book a walkthrough".
- No AI-looking imagery: no generated faces, robots or glowing-brain art. Visuals are real-looking UI cards built from the client's own data, over documentary photos from Higgsfield.
- Example businesses and numbers are labeled "values illustrative" until real client data replaces them.

## Where the details live (read only what the task needs)
- Site and demo structure: `docs/claude/site.md`
- API endpoint: `api/CLAUDE.md` (loads when you work in `api/`)
- Building a client kit from a website: the `client-kit` skill
- How to work cheaply in this repo: `docs/claude/token-habits.md`

## Working style
- Plan mode before multi-file edits. Edit with small diffs; never rewrite a whole file to change part of it.
- Find things with Grep or Glob first, then Read only the line range you need. `demo.html` is ~58 KB; don't read it whole.
- Hand searches, reviews and research to the Sonnet subagents in `.claude/agents/`.

## Compact instructions
When compacting, keep: the current task, decisions made, file paths and line numbers touched, and open questions. Drop: full file contents, command output, and dead ends.
