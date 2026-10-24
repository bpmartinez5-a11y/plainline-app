PASS (with three conditions before `JEV_API_KEY` is set)

# The Enforcer: PR #14, Jev sort step on /api/chat

Target: `bpmartinez5-a11y/plainline-app#14`, head `0172ef2`, diff vs `main` (api/chat.js, demo.html, privacy.html, docs/subprocessors.md). Tier: High. Run 2026-10-24 before merge, at Ben's request to merge.

The change ships switched off: with no `JEV_API_KEY` in Vercel, no data goes to TypeSafe and the demo behaves as before. The findings below are about the day the key is added.

## Findings

**Medium: the demo's in-chat privacy notes name only Anthropic** (`demo.html:648`, `demo.html:773`). When sorting is on, the visitor's last three messages also go to TypeSafe AI. The privacy policy says so; the pill and setup note in the demo don't. Fix before adding the key: name both providers in those two strings, or show "our AI providers".

**Medium: TypeSafe's data terms are unconfirmed** (`docs/subprocessors.md`, TypeSafe row). Retention, training on API data and US storage are all marked "Confirm". Fix before adding the key: read TypeSafe's current API terms and fill in the row with the date checked. Until then it is not for PHI, so it is never switched on for a health client (dental) without a signed BAA.

**Low: no spend cap on the Jev key yet.** A script with a forged Origin header can send up to 2,000 characters per request to Jev, inside the existing 30-per-hour, per-IP limit. That is the same soft origin check `/api/chat` already relies on. Fix: set a spend limit on the key when it's created.

**Low (pre-existing, not in this diff):** `api/chat.js:165` logs Anthropic's error body. That body is unlikely to contain visitor text, but `api/CLAUDE.md` says never to log full visitor messages. Fix in a later PR: log the status only.

## Checked and fine
- Secrets: no keys, tokens or emails in the diff. The Jev key is read from env only.
- Order of checks: the Jev call starts only after the origin, prompt-template and rate-limit checks. The response still goes through `pick()`, and `sort` is a hand-built four-field object.
- Logging: the Jev paths log the status code or the error name only.
- Failure: Jev errors and timeouts (4 seconds) return null, so the demo's 501, 429 and 502 fallbacks are unchanged.
- Safety: sorting can only add a hand-off, never remove one. Urgent replies point to 911 first.
- AI disclosure: unchanged. The assistant still says it is automated.
- Client agreement: no outbound sends, no new message types, and STOP and quiet hours are untouched. A new sub-processor is listed; the 15-day client notice is a needsBen card in the Command Center.
- Boundary: no client data, Creative Planning data or personal data in the diff. All example businesses are made up.

## Needs a lawyer
The privacy-policy sentence about TypeSafe binds Ben once real visitors' messages flow to it. It should go to a lawyer with the next privacy review, before a client site uses Jev.

## Not checked
- TypeSafe's actual terms. They're behind its console and docs and weren't read here.
- The live Jev API itself. It was tested only against stubbed responses, since there's no key.
- Incident eval cases: none were passed in.
