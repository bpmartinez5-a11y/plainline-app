---
name: refactor-clean
description: "Restructure messy code into clean, modular, loosely coupled pieces without changing product behavior. Use when a file has grown too big (e.g. demo.html) or logic is duplicated. Covers folder structure, separation of concerns and an explanation of each improvement."
---
# Clean refactor, same behavior

1. **Map it.** Run the `auditor` subagent on the target. Save its "how it works" and data-flow summary, which is the behavior to preserve.
2. **Pin current behavior.** Write a short checklist of what must still work, e.g. "demo sends a text and gets a reply; falls back when `/api/chat` returns 501; works at 400px". Do it before touching code.
3. **Propose the structure.** Show the new folder and file layout and what moves where. Keep it plain: static pages can load `assets/js/*.js` and `assets/css/*.css` with no build step. Get Ben's yes in plan mode.
4. **Move in small steps.** One extraction per commit: move code, update references, check, commit. Never rewrite and move in the same step.
5. **Verify after each step.** Run the behavior checklist, `node --check` on changed JS, and a 400px check. Run the review gate at the end (`reviewer`, then `refuter`).
6. **Report.** The new structure, what each change improves (coupling, reuse, size), and anything left for later.
