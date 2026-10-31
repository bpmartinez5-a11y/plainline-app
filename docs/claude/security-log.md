# Security log

One line per finding from `/security-audit`. Never write a secret value here.

| Date | Severity | Finding (file:line) | Status |
|---|---|---|---|
| 2026-10-31 | low | Supabase `public.leads` (live): anon insert policy has no rate limit, so a script with the public key can flood rows (lengths are capped: name 200, email 320, message 5000, source 50; RLS on, anon can't read) | open: add an insert-rate trigger like `ops_leads`, revoke unused anon grants |
| 2026-10-31 | low | `api/chat.js:32-45`: headers are spoofable from a script, and only the prompt's start and end are checked, so it can be used for short free replies (30/IP/hour, 600/instance/hour) | accepted: spend limit on the key is the cap |
| 2026-10-31 | low | `api/studio-scan.js:22-35`: DNS looked up twice (rebinding gap); missing ranges 64:ff9b::/96, 2002::/16, 198.18.0.0/15, hex IPv4-mapped IPv6. Only Ben can start a scan | open |
| 2026-10-31 | low | `api/chat.js:165`, `api/studio-profile.js:124`, `api/studio-build.js:68`: full Anthropic error body logged | open: log status and error type only |
| 2026-10-31 | low | `api/_studio.js:8-12`: no throttle on wrong Studio keys; safe only if `STUDIO_KEY` is long and random | open: confirm key length |
| 2026-10-31 | watch | `vercel.json`: no CSP or Permissions-Policy (no XSS path found; Studio previews are sandboxed) · `api/studio-build.js`: classic builder output is unsanitized (review before shipping) | watch |
