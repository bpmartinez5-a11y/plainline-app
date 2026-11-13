# Sub-processors

The client agreement (§§7.7, 7.10, 7.12, 7.15) promises clients a current list on request, 15 days' notice before a change, US storage at rest and deletion on termination. Keep this file current; any change to a row is a needsBen card so Ben can send the 15-day notice.

| Provider | Used for | Client data at rest in US? | Deletion and retention | Trains on our data? | BAA |
|---|---|---|---|---|---|
| Vercel | Hosting, API functions, cookieless analytics | Functions run in `iad1` (Washington, D.C.), the default: no `regions` key in our `vercel.json` [1]. Where Vercel keeps its own logs: not yet confirmed. | DPA: deletes customer data after termination "within a commercially reasonable timeframe"; no fixed number of days [2]. | No (hosting) | Offered on Pro (paid add-on) and Enterprise [3]. None signed. |
| Supabase | Database (leads, bookings, conversations, The Engine) | Yes. Project "Plainline" is in `us-west-2` (read from the project settings). Each client's own Engine copy picks a US region when it is set up. | Yes, we delete rows. How long Supabase keeps backups: not yet confirmed. | No | Team plan or higher plus the paid HIPAA add-on [4]. None signed. |
| Anthropic API | AI model that writes replies, checks and drafts | US-only processing is a per-request setting (`inference_geo`) on newer models at a higher rate; the default location is not stated [5]. | Inputs and outputs are deleted within 30 days; content flagged for misuse is kept up to 2 years; zero retention only by agreement [5][6]. | No. The commercial terms bar training on customer data without permission [5][6]. | Offered for the first-party API and Enterprise; Batch, Files and beta features excluded [7]. None signed. |
| TypeSafe AI (Jev) | Sorting incoming messages (booking, urgent, needs a person); off until `JEV_API_KEY` is set | Not yet confirmed (only a third-party summary says US) [8]. | Not yet confirmed [8]. | Not yet confirmed from TypeSafe's own pages [8]. | None. Not for PHI. Stays off until this row is filled from its own terms. |
| Stripe | Client invoices and payments (cards and ACH); live since Nov 2026 | Not yet confirmed (identity-check data is stored in the US) [9]. | DPA: deleted or returned at termination, except records the law requires; business records are kept 5 years or more [9]. | No (payments) | None offered. Not for PHI. |
| Twilio (chosen Nov 2, 2026) | Text messages: The Engine's texts to leads who asked for them; later, client hand-off notices. Since Nov 13, 2026: carries calls to Plainline's front desk number and the hand-off call to Ben, and keeps the front desk's voicemail recordings and their text copies | US carrier traffic. Where message logs are stored: not yet confirmed [10]. | Message log retention: not yet confirmed. Message body redaction can be turned on [10]. Voicemails and their text copies: The Engine's morning job deletes them after 90 days. | Not yet confirmed | Only on a HIPAA account (Security or Enterprise edition), US numbers only [10]. None signed. |
| Resend (added Nov 10, 2026) | The Engine's emails: the morning email, task notices and a client copy's monthly report (counts and names of the team's own tasks; no customer messages). Since Nov 2026 on Plainline's own copy: the front desk notice to the rep who calls back and, until Twilio approves texting, to Ben (a caller's name, number and what they asked for; never the voicemail or its text copy) | Yes. Resend keeps message content, logs and account data in the US whatever sending region is picked [11]. | Email and log data kept 30 days; after termination deleted within 90 days, backups 7 more days [11]. | Not yet confirmed. Its DPA is accepted at sign-up [11]. | None: Resend says it cannot sign one [11]. Not for PHI. |
| ElevenLabs (added Nov 13, 2026) | The voice front desk on Plainline's own number: speech to text, the voice, and the AI model that answers (Claude, run by ElevenLabs). Plainline's own calls only; no client data yet | Not confirmed. The DPA offers data residency only at ElevenLabs' discretion [15]. | Call recordings and transcripts: 90 days (our agent's privacy setting, read back from the ElevenLabs API Nov 13). DPA: processor on our documented instructions, no sale of the data, breaches reported without undue delay, sub-processors listed at compliance.elevenlabs.io with 30 days' notice; a self-serve account may be deleted after 180 days with no activity. Deletion after termination: not yet confirmed [15]. | Yes, by default: the privacy policy says Inputs and Outputs are used to train its models. Our account: off since Nov 13, before any real call (Ben's pick; the switch is Terms and privacy, Data use, "Improve the models for everyone"; it read back off after a reload) [15]. | Enterprise only. None signed. Not for PHI. |
| Claude (Claude Code and Claude app sessions) | Agents that build, review and run reports | Not yet confirmed | Commercial plans: 30 days. Consumer plans (Pro, Max): 30 days with "Help improve Claude" off, 5 years with it on [12]. | Commercial plans and the API: no, by default. Consumer plans: only if "Help improve Claude" is on [12]. Ben's sessions run on a consumer plan, so that setting must stay off. | Enterprise and the first-party API only; not Pro or Max [7]. Not for PHI. |
| GitHub | Client site code repos | Not yet confirmed (US-only storage is an Enterprise Cloud option) [13]. | Yes | Not yet confirmed | None found. Not for PHI. |
| Google Workspace | ben@plainlineops.com: client requests, opt-outs, notices; the walkthrough booking page (Calendar) | Only when Data regions is set to "United States", which needs Enterprise Plus [14]. | Yes, through admin retention settings. | No. The service terms bar training Workspace AI on customer data without permission [14]. | Offered; some Gemini features excluded [14]. None signed. |

Checked 2026-11-10. The answers come from the providers' own pages below, read through search results because this sandbox could not open the pages directly. Open the link again before you quote a row to a client.

Sources: [1] vercel.com/docs/functions/configuring-functions/region · [2] vercel.com/legal/dpa · [3] vercel.com/docs/security/compliance · [4] supabase.com/docs/guides/platform/hipaa-projects · [5] platform.claude.com/docs/en/manage-claude/api-and-data-retention · [6] privacy.claude.com (How long do you store my organization's data?) · [7] privacy.claude.com (Business Associate Agreements for commercial customers) · [8] typesafe.ai/legal/privacy-policy and /legal/data-processing (not read yet) · [9] stripe.com/legal/dpa · [10] twilio.com/docs/iam/twilio-editions/hippa · [11] resend.com/security and resend.com/legal/dpa · [12] code.claude.com/docs/en/data-usage · [13] docs.github.com, About storage of your data with data residency · [14] workspace.google.com/terms/service-terms · [15] elevenlabs.io/dpa (last updated Apr 8, 2026; read Nov 13 in Ben's browser; it covers self-serve accounts through the Terms) and elevenlabs.io/privacy-policy

## Gaps against the agreement (for the attorney, memo question 9)

- §7.15 US storage: the Anthropic API needs the US-only setting to promise it; Twilio log storage, Stripe, GitHub and Google Workspace are not confirmed or need a higher plan. Soften 7.15 to "where the Sub-processor offers it" or list the exceptions here.
- §7.12 deletion schedule: Stripe keeps business records 5 years or more, and Anthropic keeps flagged content up to 2 years. Add a carve-out for records a provider must keep by law or for abuse review.
- §4.3 no training: true for the API and commercial plans. On a consumer Claude plan it holds only while "Help improve Claude" is off.
- §7.10 safeguards: no provider's encryption or MFA page was read yet. The safeguards summary below stays "not yet confirmed".

## To check by hand (only Ben can)

- Vercel projects `plainline` and `plainline-ops`: Settings, Functions, region is `iad1` (US).
- Claude: Settings, Privacy, "Help improve Claude" is off on the account the agents use.
- Accept or download the Vercel and Anthropic DPAs from each account.
- Twilio: message log retention, and turn on message body redaction if wanted.
- Google Workspace: Admin, Data regions (which edition you have).
- MFA on Vercel, Supabase, Stripe, Twilio, Resend, GitHub and Google.

"Confirm" means check the provider's current terms or settings and replace the word with the answer and the date checked. Don't list a provider as compliant from memory.

No protected health information reaches a provider unless its BAA column says yes.

## Safeguards summary (agreement §7.10)

The Access keeper (roster agent `access`) fills this each quarter: per provider, whether data is encrypted at rest, whether MFA is on for Plainline's admin accounts, and any exception. Until filled, say "not yet confirmed" when a client asks.
