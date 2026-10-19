# api/

Every change in `api/` is **High** tier: Ben approves and the-enforcer passes.

| File | What it does | Auth |
|---|---|---|
| `chat.js` | Demo text assistant: POST builds a prompt, calls Claude and returns one JSON reply; GET reports whether AI is on | Public; same-origin check and per-IP limit |
| `studio-scan.js` | Studio: fetches a business's website server-side and returns its pages | `x-studio-key` header (Ben only) |
| `studio-build.js` | Studio: asks Claude to build a client site from a scan | `x-studio-key` header (Ben only) |
| `_studio.js` | Shared Studio helpers (`authorized`, `body`). Files starting with `_` aren't routes on Vercel. | — |

Conventions every endpoint keeps:
- 405 for the wrong method, 400 for bad input, 501 when an env var is missing (`ANTHROPIC_API_KEY`, `STUDIO_KEY`), 401 for a wrong Studio key, 429 when rate-limited, 422 when a scan can't read a site, 502 when Claude or an upstream call fails.
- The demo keeps working without AI: 501, 429 and 502 make it fall back to built-in replies.
- Models come from env (`ANTHROPIC_MODEL`, default `claude-haiku-5-5` for the public demo). Keep the public endpoint on a Haiku-class model.
- Never log or echo keys or full visitor messages. Compare secrets with `crypto.timingSafeEqual` (see `_studio.js`).
- The per-IP rate limit lives per warm instance, so it's soft. The real cap is the spend limit on the API key.
