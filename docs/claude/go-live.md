# Taking a client live (internal)

Moved off the public demo on Oct 30, 2026: prospects see "Book a walkthrough" instead. Use this list when a signed client goes live.

1. **Agreement.** The client signs the Plainline service agreement before setup starts.
2. **AI disclosure.** Keep it on: customers see "automated assistant" in the header and at the start of every chat, and the assistant never claims to be a person.
3. **Channels.** Website chat widget and SMS first. iMessage through a phone-number provider such as Blooio next. Apple Messages for Business (verified logo, Apple Pay) after Apple approves the brand.
4. **Calendar.** Swap the demo availability for the client's real calendar: Google Calendar, Square, Vagaro, Calendly or GoHighLevel.
5. **Deposits.** Connect the client's own payment link (Stripe, Square or Clover) in their build; the public demo only shows a demo button (Payments setup removed Oct 30). Plainline never holds their customers' money.
6. **Alerts.** Text or Slack the front desk when a chat is flagged "Needs you".

## Front desk launch checklist (deep dream, Nov 1, 2026)

Plainline sells an AI front desk for missed and after-hours calls, but the texting and call parts are not built yet. The demo and the site cover web chat only. Do these steps in order. Most of them can start before a client signs. The first client could sign on about Dec 1, which leaves about two weeks to launch.

**Before any client signs**
1. **Texting provider: Twilio** (Ben, Nov 2, 2026; already in `docs/subprocessors.md` and `privacy.html`). A calling provider, if the client needs one, is added to both in the same PR.
2. **Start texting registration.** US business texting needs A2P 10DLC brand and campaign registration. It can take a few weeks, so start it as soon as Ben picks the provider. Use Plainlineops LLC as the brand.
3. **Build the runtime in a sandbox** for a made-up client (`studio-examples/ridgeline-sample.json`): missed-call text-back, the hand-off sender, STOP and quiet hours. `api/` is High tier: Ben approves and the-enforcer passes.
4. **Rehearse once.** Copy The Engine for the made-up client (jarvis-app `ops/README.md`, "A copy for a client"). Run a missed call, a hand-off, a failed send and a STOP from start to finish.

**What the runtime must do (the client agreement promises these)**
- The assistant says it is automated in the first message (§2.3).
- A hand-off reaches the designated contact in under 5 minutes. A failed send is resent by the Fact Sheet backup method, and every send is logged (§§2.3, 3.3, 7.12).
- Outbound message types in the Order Form go only to numbers with a consent record, and never during quiet hours (§3.4).
- STOP is honored automatically.
- Replies to a customer's own message and hand-off notices to the client are never blocked (§3.4).

**Launch day**
1. Go through the 6 steps at the top of this file.
2. Send one test from Ben's phone: a missed call, a text and a STOP.
3. Check the log shows every send. Then turn the number on for the client.
