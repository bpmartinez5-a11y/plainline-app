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
| Signing | Client agreement + Order Form (package, channels, permitted message types, fees, initial term), then the welcome doc the same day. Before the first signing: lawyer-reviewed template, and tech E&O plus cyber insurance in force (§14.10). Health clients: BAA signed with the agreement, before the setup call, any calendar connection or patient list |
| Setup call | Project brief, which is the Fact Sheet (staffed hours, hand-off contact and backup, after-hours contact, safety instructions, carrier registration details). Run the-enforcer before connecting the client's calendar, number or database |
| Billing | Invoice plus payment page, on the dates in the agreement |
| Go-live | Delivery guide (also the one-page explainer the `sitereview` star requires). Go-live is blocked until: the client's written OK on the fact sheet is saved; a signed BAA is on file (health clients); written consent confirmation is on file for each outbound message type in the Order Form; a preview test passes: STOP stops sends, a hand-off arrives in under 5 minutes, a failed send triggers the backup, a send-log row is written, and sends are blocked outside quiet hours and without a consent record |
| Every month | Monthly report from real numbers: answered, booked, after hours, average reply, hand-offs, top questions |
| After launch | Thank-you note, then a feedback request at 30 days |
| Termination (owner: Constellation `onboarding`; trigger: the `bizinbox` label "termination") | Auto-reply for 30 days; return data within 30 days if asked within 30 days; port the number if asked within 30 days; return or destroy confidential information; delete from our systems and every sub-processor within 90 days (after the return, if one was asked for), keeping only hand-off delivery logs (§7.12); confirm deletion in writing if asked (agreement §§6.3, 7.12) |

**Rules**
1. Never put a price, fee or dollar amount on the package menu or any marketing page. Invoice amounts come only from the signed Order Form.
2. The client agreement is a template. A lawyer reviews it before the first paying client signs, and Ben signs every agreement himself.
3. Monthly reports use the client's real numbers from the owner app or Supabase: aggregate counts only, never message text or customer names. Exclude "Plainline test" entries. If a number isn't available, leave it out; never estimate it. Remove the "values illustrative" tag only when every number is real.
4. Real-client profiles and filled documents live in the Client Docs artifact, never in the repo. Ben sends every document. Draft them, save them, and put a card in his inbox; don't email clients directly.
5. Feedback answers marked "Yes" for sharing go to the case-study writer. Anything negative goes to Ben the same day.
6. Run the review gate (`reviewer`, then `refuter`) on any document that changes the agreement terms or the package menu.
