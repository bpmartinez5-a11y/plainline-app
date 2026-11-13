# Site map (for Claude)

| Path | What it is | Size note |
|---|---|---|
| `index.html` | Marketing site for plainlineops.com (animated hero conversation, phone action bar). Its contact form and walkthrough chat ask four quick questions and post requests to `/api/lead`, which saves them to Supabase `leads` with per-visitor limits. Only a fit sees the booking page (Nov 13); the trade pages' Book buttons go to the form | ~22 KB: Grep, then read ranges |
| `qualify.js` | The qualifier (Ben, Nov 13: "qualify the leads before I even see the traffic"): the four questions and the fit / check / not a fit rule, loaded by `index.html` and `api/lead.js`. What each agent does with each answer: project files `plainline/website/README.md`. Tests: `tests/qualify.test.js` | small |
| `demo.html` | Live text-assistant demo; `book.plainlineops.com` redirects here (see `vercel.json`) | ~58 KB: never read whole |
| `studio.html`, `studio-styles.json` | Studio: Ben's tool that scans a business's site and builds a client site; the search bar builds a website + owner dashboard through the engine (uses `api/studio-*`) | ~18 KB |
| `studio-engine.js` | The engine: renders a site profile into the client website and owner dashboard (browser and Node). Fixtures in `studio-examples/`, tests in `tests/`. Tactile buttons, hold-to-delete and the printed request slip follow `.claude/skills/tactile-ui/` | ~90 KB |
| `api/` | Serverless endpoints. See `api/CLAUDE.md` | |
| `tests/` | `node --test tests/*.test.js`: Studio engine and profile, and the demo chat endpoint (`chat.test.js`, fake Claude and Jev, no network). `.github/workflows/tests.yml` runs them on every PR | |
| `appstore/` | App Store listing (`listing.md`), screenshot generator (`make_screenshots.js`, `seed.js`) and screenshots | Don't read the PNGs |
| `icons/`, `manifest.webmanifest` | Logo files (Ben's pick, Nov 12: "B · Full stop"; copies of project files `plainline/brand/final/`, never redrawn): app icons, `favicon.svg` + `favicon-32.png`, the "plainline." wordmark (`plainline-wordmark-dark.svg` on glass or dark, `-light.svg` on light). `index.html` inlines the "p." mark once as `#pl-mark`. Every page uses the Plainline colors (index.html `:root`); the Studio's client previews keep their own looks | |
| `sell.html` | The seller one-pager (plainlineops.com/sell, noindex, not in the sitemap) with 5 questions. The Engine's Send to box (jarvis-app `ops/`, Inquiries tab) texts or emails its link. Answers go to `/api/lead` as source `website · sellers`, so they land on The Engine's Inquiries tab. Its text comes from the seller kit's one page (project files `plainline/sellers/onboarding/`): no prices, no pay terms | ~12 KB |
| `privacy.html`, `terms.html` | Legal pages. Keep in step with what the API stores or logs | |
| `llms.txt`, `sitemap.xml`, `robots.txt`, `og.png` | Search and AI-answer discovery, share image | |
| `vercel.json` | Clean URLs, the book.* redirect, security headers | |
| `docs/claude/go-live.md` | Internal checklist for taking a signed client live (moved off the public demo, Oct 30) | |

In `demo.html`, the sample businesses live in a JS object where each one has `policies:` strings. Those are the demo client's own prices, not Plainline's, so they may stay.

The UI card kit (scroll story, swipe decks, reel, 6 industry profiles) is published as a Claude artifact. The `client-kit` skill defines the client profile fields. There is no price field, by design.
