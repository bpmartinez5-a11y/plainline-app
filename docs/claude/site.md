# Site map (for Claude)

| Path | What it is | Size note |
|---|---|---|
| `index.html` | Marketing site for plainlineops.com (animated hero conversation, phone action bar). Its contact form posts leads straight to Supabase (`/rest/v1/leads`) with the publishable key | ~22 KB: Grep, then read ranges |
| `demo.html` | Live text-assistant demo; `book.plainlineops.com` redirects here (see `vercel.json`) | ~58 KB: never read whole |
| `studio.html`, `studio-styles.json` | Studio: Ben's tool that scans a business's site and builds a client site; the search bar builds a website + owner dashboard through the engine (uses `api/studio-*`) | ~18 KB |
| `studio-engine.js` | The engine: renders a site profile into the client website and owner dashboard (browser and Node). Fixtures in `studio-examples/`, tests in `tests/` | ~86 KB |
| `api/` | Serverless endpoints. See `api/CLAUDE.md` | |
| `appstore/` | App Store listing (`listing.md`), screenshot generator (`make_screenshots.js`, `seed.js`) and screenshots | Don't read the PNGs |
| `icons/`, `manifest.webmanifest` | Installable web app icons and manifest | |
| `privacy.html`, `terms.html` | Legal pages. Keep in step with what the API stores or logs | |
| `llms.txt`, `sitemap.xml`, `robots.txt`, `og.png` | Search and AI-answer discovery, share image | |
| `vercel.json` | Clean URLs, the book.* redirect, security headers | |
| `docs/claude/go-live.md` | Internal checklist for taking a signed client live (moved off the public demo, Oct 30) | |

In `demo.html`, the sample businesses live in a JS object where each one has `policies:` strings. Those are the demo client's own prices, not Plainline's, so they may stay.

The UI card kit (scroll story, swipe decks, reel, 6 industry profiles) is published as a Claude artifact. The `client-kit` skill defines the client profile fields. There is no price field, by design.
