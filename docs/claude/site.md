# Site map (for Claude)

| File | What it is | Size note |
|---|---|---|
| `index.html` | Marketing site for plainlineops.com | ~12 KB, fine to read |
| `demo.html` | Live text-assistant demo; `book.plainlineops.com` redirects here (see `vercel.json`) | ~58 KB: Grep for the section, then Read with offset/limit |
| `api/chat.js` | AI reply endpoint used by the demo | see `api/CLAUDE.md` |
| `privacy.html`, `terms.html` | Legal pages | rarely touched |
| `vercel.json` | Clean URLs, the book.* redirect, security headers | |
| `sitemap.xml`, `robots.txt`, `og.png` | SEO | |

In `demo.html`, the sample businesses live in a JS object where each one has `policies:` strings. Those are the demo client's own prices, not Plainline's, so they may stay.

The UI card kit (scroll story, swipe decks, reel, 6 industry profiles) is published as a Claude artifact. Each client profile is a JSON object with: business, trade, accent, hook, outcome, inbox, week, stages, log, stats, handoff, includes. There is no price field, by design.
