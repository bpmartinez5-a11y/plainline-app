PASS

# The Enforcer: PR #12, legal pass on site, demo and policies (2026-10-21)

Target: plainline-app branch `claude/legal-review`, diff vs `origin/main` (.vercelignore, demo.html, index.html, llms.txt, privacy.html, terms.html).

## Findings

**Medium**
- `terms.html` (liability): the cap is "what you paid us to use them: nothing". A zero cap may be challenged. Ben's rule bars dollar amounts on client-facing pages, so this stays as is until a lawyer picks the wording.
- `terms.html:39`: "Plainlineops LLC (state registration in progress)". The terms and liability limit run to an entity the page says isn't formed yet. Update once the Kansas filing is confirmed.
- `demo.html` prompt: the safety rules (disclosure, 911, no unlisted discounts, customer-text wrapping) are in the prompt the browser builds. Anyone can send an edited prompt to `/api/chat`; the reply only goes back to them. Moving these rules into the server `system` string in `api/chat.js` is a separate High-tier PR.

**Low**
- `.vercelignore` is a block-list: a new repo-only folder goes live unless added. After deploy, confirm 404 for /CLAUDE.md, /api/CLAUDE.md, /reports/enforcer/2026-10-19-chat-api-hardening.md and /appstore/listing.md.
- Policies name no business email or mailing address (contact form only).

## Security pass
- Secrets: diff scanned for keys, tokens, passwords and personal emails: none.
- XSS: new strings are static or set with `textContent`; customer text is still escaped on render and has `<` and `>` stripped before it enters the prompt, so it can't close the `<<< >>>` wrapper.
- Data: no new collection; the pill and intake note now say when chats go to the AI provider, matching privacy.html.
- AI-specific: customer text is marked as data in the prompt; fallback 911 replies use whole-word matching (tested: "paint correction" and "gas furnace" don't trigger, "I smell gas" does).

## Legal pass
- AI disclosure unchanged and strengthened (header, first system message, prompt rule).
- No Plainline price anywhere; demo prices are the sample business's and are labeled.
- Kansas governing law matches the services agreement; 18+ and Terms assent shown at the contact form; Do Not Track statement added.

## Boundary pass
- No Creative Planning, personal finance or real client data in the diff.

## Needs a lawyer
- Liability cap wording, the pre-formation entity statement, and whether the Do Not Track and Anthropic-retention sentences are sufficient for the states where visitors are.

## Not checked
- The website launch checklist (`/mnt/project-files/research/website-production/launch-checklist.md`) isn't reachable from this session.
- Supabase RLS on the `leads` table (privacy policy says the site can add rows but not read them).
- Anthropic's current API retention terms.
