PASS for the Studio and concept previews. Generated sites are NOT cleared for a client's live domain yet (see High 1).

# Enforcer: Studio engine (branch `studio-engine`)

Target: `studio-engine.js`, `api/studio-profile.js`, the new flow in `studio.html`, fixtures and tests. Date: 2026-10-21.

## Findings

**High 1. Generated sites can't go live as built.** `studio-engine.js` booking form only shows a "Preview only" note; nothing is sent. The owner dashboard (`owner.html`) saves to the viewer's browser and has no login. A live site needs: the form connected (server route, Turnstile, rate limit, Supabase, Resend), the dashboard behind Supabase Auth with MFA, and a privacy page listing sub-processors. Fix: kept as a standing Studio todo (added by `api/studio-profile.js` `enforce()`), a note in the Studio under the downloads, and a rule in `CLAUDE.md`. Status: documented; build in Phase 2.

**Medium 1. Prompt injection could plant links.** Scraped page text goes to Claude; a page could tell the planner to add a phishing "social" link or a different domain. Fix applied: `api/studio-profile.js` `enforce()` keeps only social links found in the scan's own link list and always sets the domain from the scan. Photos were already limited to image URLs present in the scan. Test: `tests/studio-profile.test.js` (phish link and `evil.example` domain are dropped).

**Medium 2. Overstated privacy line.** "Your details go to <business> only" isn't true once the form runs through Plainline's sub-processors (Vercel, Supabase, Resend). Fix applied: now "Your details go to <business> and are never shown on this site." The consent line "My details aren't sold or shared" matches the client agreement's no-sell/no-share clause (Section 7.5).

**Low 1. Example data.** Fixtures are made-up businesses only (`photographer-sample.json`, `ridgeline-sample.json`) with `example` domains. No real person's data in the repo.

**Low 2. Scraped content sent to Anthropic.** The new endpoint sends the public site scan to Anthropic, same as the existing `api/studio-build.js`. Anthropic is a listed sub-processor. Email addresses are stripped from the output (`enforce()`), though they can still appear in the input scan.

**Low 3. Photos hot-linked from the old host.** Fine for a concept shown to the owner; before launch, migrate images to the client's own storage (also needed so cancelling Wix doesn't break the site). In the launch todo.

## Security pass
- Secrets: none in the diff (tests use dummy values). Keys stay in Vercel env.
- Auth: `studio-profile` checks `STUDIO_KEY` before reading the body or calling Claude.
- Output handling: every profile string is escaped in both runtimes; the profile is embedded as JSON with `<`, `>`, U+2028/9 escaped; only http(s) and in-browser `data:image` sources render; the preview iframe is sandboxed without same-origin. A hostile-profile render test showed no script execution.
- Data: the dashboard re-encodes uploaded photos through a canvas, which drops EXIF/GPS.

## Legal and compliance pass
- No Plainline prices anywhere on generated pages (client's own prices are `ADD:` placeholders).
- Minors: senior/athlete bookings ask for a parent or guardian; nothing is collected from under-13s.
- Preview pages carry a "Concept preview by Plainline … not live" banner and `noindex`.
- Not checked: a privacy page template (doesn't exist yet), accessibility audit beyond contrast fitting and labels.

## Needs a lawyer
- The privacy page and form consent wording for live client sites, before the first one launches.

## Not checked
- The reviewer agent's findings are tracked in the PR, not here.
- Live behavior against a real Anthropic response (tests use a fake streamed tool call).
