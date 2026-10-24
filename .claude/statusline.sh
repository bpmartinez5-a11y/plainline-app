#!/bin/sh
# Status line: model · context used % · a nudge when it's time to /compact or /clear.
# Reads Claude Code's status JSON on stdin. Plain sh + sed so it runs on macOS with no extra installs.
in=$(cat)
model=$(printf '%s' "$in" | sed -n 's/.*"display_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n1)
pct=$(printf '%s' "$in" | sed -n 's/.*"used_percentage"[[:space:]]*:[[:space:]]*\([0-9.]*\).*/\1/p' | head -n1)
pct=${pct%%.*}
[ -z "$pct" ] && pct=0
tip=""
if [ "$pct" -ge 60 ]; then tip=" · /compact <focus> or /clear"; elif [ "$pct" -ge 40 ]; then tip=" · wrap this task up soon"; fi
printf '%s · context %s%%%s' "${model:-Claude}" "$pct" "$tip"
