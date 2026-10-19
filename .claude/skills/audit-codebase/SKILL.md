---
name: audit-codebase
description: "Senior-engineer audit of the whole repo. Maps how it works and the data flow, then reports bad architecture, duplicate logic, bottlenecks, scaling risks and maintainability issues with a refactor plan. Report only; changes nothing."
---
# Codebase audit

1. Run the `auditor` subagent on the repo, or on the folder Ben names.
2. In parallel, run `perf-engineer` and `security-auditor` if Ben asked for a full audit. Otherwise mention that they're available.
3. Pass every finding to `refuter` and keep only the verified ones.
4. Merge the results into one report:
   - **How it works**: about 10 lines.
   - **Critical problem areas**: the top 5 across all reports, deduplicated, each with file:line and severity.
   - **Refactor strategy**: ordered, behavior-preserving steps, each small enough for one commit.
   - **Leave alone**: things that look odd but are fine, and why.
5. Don't change any files. To act on it, Ben runs `refactor-clean` (structure), `perf-pass` (speed) or `security-audit` (fixes).
