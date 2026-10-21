---
name: client-docs
description: "Fill Plainline's ten client documents for a specific client: agreement, welcome doc, project brief, invoice, payment, delivery guide, monthly report, thank-you, feedback request and package menu. Use when a client signs, goes live, gets a monthly report or renews."
---
# Client documents

The ten templates live in the Plainline Client Docs artifact (https://claude.ai/artifact/7UspiNzPMoxRKbZCWFmwmN). Each one fills from a client profile: business, owner, trade, accent, job (Front Desk, Lead Desk…), services, hours, hand-off rules, stats and top questions.

**When each one goes out**

| Moment | Documents |
|---|---|
| Walkthrough | Package menu |
| Signing | Client agreement + Order Form (package, channels, permitted message types, fees, initial term), then the welcome doc the same day |
| Setup call | Project brief (this becomes the assistant's fact sheet) |
| Billing | Invoice plus payment page, on the dates in the agreement |
| Go-live | Delivery guide (also the one-page explainer the `sitereview` star requires). Go-live is blocked until: the client's written OK on the fact sheet is saved; a signed BAA is on file (health clients); written consent confirmation is on file for each outbound message type in the Order Form |
| Every month | Monthly report from real numbers: answered, booked, after hours, average reply, hand-offs, top questions |
| After launch | Thank-you note, then a feedback request at 30 days |
| Termination | Auto-reply for 30 days, then deletion confirmation within 90 days (agreement §§6.3, 7.12) |

**Rules**
1. Never put a price, fee or dollar amount on the package menu or any marketing page. Invoice amounts come only from the signed Order Form.
2. The client agreement is a template. A lawyer reviews it before the first paying client signs, and Ben signs every agreement himself.
3. Monthly reports use the client's real numbers from the owner app or Supabase: aggregate counts only, never message text or customer names. Run the-enforcer the first time a client's data source is connected. If a number isn't available, leave it out; never estimate it. Remove the "values illustrative" tag only when every number is real.
4. Ben sends every document. Draft them, save them, and put a card in his inbox; don't email clients directly.
5. Feedback answers marked "Yes" for sharing go to the case-study writer. Anything negative goes to Ben the same day.
6. Run the review gate (`reviewer`, then `refuter`) on any document that changes the agreement terms or the package menu.
