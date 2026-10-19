# Token habits for this repo

The settings in `.claude/settings.json` cover most of this automatically. The rest are habits.

## Already set up
| Fix | Where |
|---|---|
| Opus plans, Sonnet does the edits (`opusplan`) | `settings.json` → `model` |
| Medium effort by default, not max everywhere | `settings.json` → `effortLevel`. Use `/effort high` only for a hard problem, then drop back. |
| Start in plan mode before edits | `settings.json` → `permissions.defaultMode: "plan"` |
| Subagents run on Sonnet | `.claude/agents/*.md` → `model: sonnet` |
| Never read `node_modules`, build output, minified files, source maps | `settings.json` → `permissions.deny` |
| Cap Bash output at 12k characters | `env.BASH_MAX_OUTPUT_LENGTH` |
| Auto-compact earlier (at 75% instead of near full) | `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` |
| Context % on screen | `.claude/statusline.sh` |
| Turn cap on unattended runs | `scripts/claude-headless.sh` (`--max-turns`, default 15) |
| Short CLAUDE.md, details in nested files and skills | `CLAUDE.md` → `docs/claude/`, `api/CLAUDE.md`, `.claude/skills/` |

## Habits
- **Check usage first.** Run `/usage` at the start of a long session. `npx ccusage` gives a fuller history, but it's a community tool, not Anthropic's.
- **One task per conversation.** `/clear` when you switch tasks. Don't drag the last task's context along.
- **Compact with a focus.** At 40–60% context, run `/compact keep the decisions and file paths for <task>` instead of letting it auto-compact everything.
- **Resume, don't re-explain.** `claude --continue` picks up the last session in this folder; `claude --resume` picks from a list.
- **Grep, then read with offsets.** Find the line first, then read 40–80 lines around it. Never read `demo.html` whole.
- **Edit with diffs, not rewrites.** Ask for the specific change. "Rewrite the file" resends all of it.
- **No 1-minute loops.** Every `/loop` fire resends the whole context. Use 10 minutes or more, or wait for an event instead.
- **Skills over CLAUDE.md.** Repeatable procedures go in `.claude/skills/` and load only when used. CLAUDE.md stays under about 40 lines.
