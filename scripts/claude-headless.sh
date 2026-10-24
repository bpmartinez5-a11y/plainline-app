#!/bin/sh
# Run Claude Code unattended with a hard turn cap so a stuck run can't burn tokens.
# Usage: scripts/claude-headless.sh "Run the reviewer on the last commit"
# MAX_TURNS=25 scripts/claude-headless.sh "..."   (default 15)
# The repo defaults to plan mode, which can't edit files. This runner overrides it to acceptEdits
# so unattended tasks can change files. Bash commands still ask, and deny rules still apply.
set -eu
[ $# -ge 1 ] || { echo 'usage: scripts/claude-headless.sh "task"' >&2; exit 1; }
exec claude -p "$1" --max-turns "${MAX_TURNS:-15}" --effort medium --permission-mode acceptEdits
