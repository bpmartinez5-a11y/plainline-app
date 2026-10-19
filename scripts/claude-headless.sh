#!/bin/sh
# Run Claude Code unattended with a hard turn cap so a stuck run can't burn tokens.
# Usage: scripts/claude-headless.sh "Run the reviewer on the last commit"
# MAX_TURNS=25 scripts/claude-headless.sh "..."   (default 15)
set -eu
[ $# -ge 1 ] || { echo 'usage: scripts/claude-headless.sh "task"' >&2; exit 1; }
exec claude -p "$1" --max-turns "${MAX_TURNS:-15}" --effort medium
