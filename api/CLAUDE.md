# api/

Every change in `api/` is **High** tier: Ben approves and the-enforcer passes.

| File | What it does | Auth |
|---|---|---|
| `chat.js` | Demo text assistant: POST builds a prompt, calls Claude and returns one JSON reply; GET reports whether AI is on | Public; same-origin check and per-IP limit |
| `lead.js` | Saves a walkthrough request (contact form or walkthrough chat) to Supabase `leads` with the server key (`SUPABASE_SECRET_KEY`, from the Supabase integration); 3 per IP per hour, 6 a day, plus the Vercel firewall rule on `/api/lead`. The browser can no longer write the table. | Public; same-origin check and per-IP limit |
| `studio-scan.js` | Studio: fetches a business's website server-side and returns its pages. Public addresses only: the connection's own DNS lookup is checked (`safeLookup`), so there's no second lookup to rebind | `x-studio-key` header (Ben only) |
| `studio-build.js` | Studio: asks Claude to build a client site from a scan | `x-studio-key` header (Ben only) |
| `studio-profile.js` | Studio engine path: asks Claude for a site profile (one `save_profile` tool call with `tool_choice` auto: Sonnet 5.5 refuses forced tool use with a 400), then sanitizes it and keeps only photos and links from the scan; streams a heartbeat, last line is the JSON | `x-studio-key` header (Ben only) |
| `preview.js` | The Engine's free website previews: POST (from ops.plainlineops.com only) scans an approved lead's site and saves a Studio profile on the lead; GET `/preview/<slug>` serves it as a labeled, noindex concept page for 30 days | POST: the rep's Supabase token (row-level security, 2-step); GET: public, unguessable slug |
| `_studio.js` | Shared Studio helpers (`authorized`, `body`). Files starting with `_` aren't routes on Vercel. | — |
| `_fire.js` | `fireEvent(kind)`: starts the Event runner (Claude Code scheduled task trig_01QPPFmh4MwZEEjbd367YqaB, jarvis-app routines `events.md`) right after `lead.js` saves a request, so the booking-link reply goes out in minutes. Sends the kind word only; off until `EVENT_FIRE_TOKEN` is set; one fire per 2 minutes and 6 a day per instance; a failure is logged and dropped | — |
| `_errtype.js` | What to log when Anthropic returns an error: the error type only, never the body (it can quote visitor or client-site text) | — |

Conventions every endpoint keeps:
- 405 for the wrong method, 400 for bad input, 401 for a wrong Studio key, 403 for a wrong origin on the public endpoints, 422 when a scan can't read a site, 429 when rate-limited, 501 when an env var is missing (`ANTHROPIC_API_KEY`, `STUDIO_KEY`), 502 when Claude or an upstream call fails.
- The demo keeps working without AI: 501 and 429 switch it to built-in replies for the rest of the visit; a 502 or network error falls back for that one reply (`demo.html`, the `/api/chat` call).
- Models come from env: `ANTHROPIC_MODEL` for the public demo (default `claude-haiku-5-5`; keep it Haiku-class) and `STUDIO_MODEL` for Studio builds (default `claude-sonnet-5-5`).
- Never log or echo keys or full visitor messages. Compare secrets with `crypto.timingSafeEqual` (see `_studio.js`).
- The per-IP rate limit lives per warm instance, so it's soft. The real cap is the spend limit on the API key.
