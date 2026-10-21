# Sub-processors

The client agreement (§§7.7, 7.10, 7.12, 7.15) promises clients a current list on request, 15 days' notice before a change, US storage at rest and deletion on termination. Keep this file current; any change to a row is a needsBen card so Ben can send the 15-day notice.

| Provider | Used for | Client data at rest in US? | Supports deletion on request? | Trains on our data? | BAA in place? |
|---|---|---|---|---|---|
| Vercel | Hosting, API functions, cookieless analytics | Confirm region setting | Confirm | No (hosting) | Confirm |
| Supabase | Database (leads, bookings, conversations) | Confirm project region | Yes (we delete rows) | No | Confirm |
| Anthropic | AI model that writes replies | Confirm current API terms | Confirm current API retention terms | Confirm current API terms | Confirm |
| SMS provider | Text messaging and hand-off notices | Not chosen yet | — | — | — |
| Claude (Claude Code and Claude app sessions) | Agents that build, review and run reports | Confirm current terms | Confirm | Confirm current terms per plan | Confirm |
| GitHub | Client site code repos | Confirm | Yes | Confirm | Not for PHI |
| Google Workspace | ben@plainlineops.com: client requests, opt-outs, notices | Confirm | Yes | Confirm | Confirm |

"Confirm" means check the provider's current terms or settings and replace the word with the answer and the date checked. Don't list a provider as compliant from memory.

No protected health information reaches a provider unless its BAA column says yes.

## Safeguards summary (agreement §7.10)

The Access keeper (Constellation `access`) fills this each quarter: per provider, whether data is encrypted at rest, whether MFA is on for Plainline's admin accounts, and any exception. Until filled, say "not yet confirmed" when a client asks.
