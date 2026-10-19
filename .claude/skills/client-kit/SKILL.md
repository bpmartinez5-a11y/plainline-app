---
name: client-kit
description: "Build a Plainline client profile and card kit from a business's website. Use when Ben shares a prospect's URL or asks for a kit for a new industry."
---
# Client kit

1. Hand the URL to the `intake` subagent. It fetches the home, services and contact pages (skipping blogs and PDFs), fills the profile below and writes it to `clients/<slug>.json`.
2. The profile fields (the card kit reads exactly these):
   - `business`, `initials`, `trade` (one line), `accent` (pulled from their logo or brand color)
   - `hook` (4 short caption parts, the third gets highlighted) and `outcome` (3 parts, the second highlighted). Both say the job done, e.g. "answers every stranded driver".
   - `inbox`: 4 realistic customer messages for this trade. The last one has status `owner` (needs a person).
   - `stages`: 4 steps (Answer → trade-specific step → Book/Dispatch → Follow up)
   - `log` (6 lines), `stats` (3 label/value pairs), `handoff`, `includes` (4 lines), `chaos` (6 places messages pile up today)
   - `week` (5 rows of 5 slots: 0 empty, 1 booked, 2 booked automatically) and `calLabel` (e.g. "test drives this week")
   - `img`: a one-line photo brief from `intake`, e.g. "tow truck on a rainy highway shoulder at night". The main session generates it with Higgsfield after quoting the credits to Ben. Documentary style, no people, text or logos.
3. No price, period or plan cost anywhere. The CTA is "Book a walkthrough".
4. Label example numbers "values illustrative" until the client confirms them.
5. Run the review gate on the result (`reviewer`, then `refuter`). At handoff, the client gets a one-page explainer of how their site works (Constellation star `sitereview`).
