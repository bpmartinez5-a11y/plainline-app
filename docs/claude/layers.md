# The five layers (for Claude)

This map sorts the repo by the five layers of agent work (Ben, Nov 3). Use it to find where a change goes. The files stay where they are. The same map for jarvis-app is `agents/layers.md` there. Its "In plain words" section explains the layers without code words.

| Layer | Job | Where it lives here |
|---|---|---|
| 1. Prompt | Says the task, the limits, what "done" is and the output shape | Each skill's `SKILL.md` in `.claude/skills/`, each subagent file in `.claude/agents/`, `docs/claude/writing-standard.md`, the profile rules and `PROFILE` schema in `api/studio-profile.js` |
| 2. Context | Controls what the model sees and what it cuts first | `CLAUDE.md` (map), `docs/claude/site.md` (files), `api/CLAUDE.md` (loads only in `api/`), `docs/claude/token-habits.md`, the read-deny list and autocompact setting in `.claude/settings.json` |
| 3. Harness | Turns a model call into a predictable unit: tools, permissions, checks, limits, logs | `.claude/settings.json` (plan mode, deny list, output cap), `.claude/statusline.sh`, `tests/` and `.github/workflows/tests.yml`, `sanitize` (runs on server and browser), `vercel.json` headers, `docs/claude/security-log.md` |
| 4. Loop | Run, check, correct, run again, and keep what was learned | The review gate: `reviewer`, then `refuter`, three rounds at most; `test-gap-reviewer` on Medium and High; incident evals for every bug that ships |
| 5. Graph | Sets who runs in parallel, who waits, the gates, and the one place Ben decides | The review gate order and the extra read-only reviewers (`database-reviewer`, `silent-failure-hunter`, `security-auditor`), `/ship-it`, the risk tiers and auto-merge in `CLAUDE.md` |

## Rules per layer

1. **Prompt.** A skill says when to use it in its description and how in its body. Each subagent has one job and a fixed output.
2. **Context.** Grep or Glob first, then read only the line range. Never read `demo.html` whole. Use the Sonnet subagents for wide searches and reviews, so each gets its own context; do a small lookup yourself.
3. **Harness.** Plan mode before multi-file edits. Tests run on every PR: `node --test tests/*.test.js`. Previews are off; test locally, then check production after the merge.
4. **Loop.** Green means: tests pass and every finding that `refuter` keeps is fixed. Only verified findings go back. After three rounds, rethink the design.
5. **Graph.** Ask for every arrow: does the next step read the previous step's output? If no value crosses, run the steps in parallel. The read-only reviewers run in parallel; `refuter` waits for all of them. Ben is the one human gate, for High PRs only.

## Where a new thing goes

1. A new instruction, tone or output rule: layer 1, in the skill or subagent file.
2. A new fact every session needs: layer 2, one line in `CLAUDE.md` or a row in `site.md`.
3. A new check, permission or limit: layer 3, a test, a setting or a workflow.
4. A fix for a repeated mistake: layer 4, a reviewer rule, then a test that catches it.
5. A new reviewer, hand-off or approval: layer 5, in the review gate section of `CLAUDE.md`.
