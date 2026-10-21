# Sub-processors

The client agreement (§§7.7, 7.10, 7.12, 7.15) promises clients a current list on request, 15 days' notice before a change, US storage at rest and deletion on termination. Keep this file current; any change to a row is a needsBen card so Ben can send the 15-day notice.

| Provider | Used for | Client data at rest in US? | Supports deletion on request? | Trains on our data? |
|---|---|---|---|---|
| Vercel | Hosting, API functions, cookieless analytics | Confirm region setting | Confirm | No (hosting) |
| Supabase | Database (leads, bookings, conversations) | Confirm project region | Yes (we delete rows) | No |
| Anthropic | AI model that writes replies | Confirm current API terms | Confirm current API retention terms | Confirm current API terms |
| SMS provider | Text messaging | Not chosen yet | — | — |

"Confirm" means check the provider's current terms or settings and replace the word with the answer and the date checked. Don't list a provider as compliant from memory.
