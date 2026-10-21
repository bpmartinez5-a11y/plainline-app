---
name: security-audit
description: "Production security audit of the site, demo and API, with a vulnerability report, severity levels, attack scenarios and fixes. Applies fixes for critical and high findings only after Ben approves."
---
# Security audit

1. **Audit.** Run the `security-auditor` subagent on the current branch.
2. **Verify each finding.** Pass the list to `refuter`. Keep a finding only if the attack path is real (who can do it, from where, and what they get). Move theoretical items to "watch".
3. **Report to Ben.** If any verified finding means client or customer data may already have been accessed, run the data exposure check in `debug-prod` step 1 first (72-hour client notice, agreement §7.11). Then report:
   - severity table (critical / high / med / low)
   - attack scenario for each critical and high finding, in plain words
   - fixes as diffs, and what each costs (time, any service)
4. **Fix after a yes.** Apply critical and high fixes first, one small diff each. Never weaken the API's fallbacks, and never print, log or commit a secret.
5. **Re-check.** Re-run `security-auditor` on the changed files and run `node --check`. Fixes in `api/` are High tier: Ben approves and the-enforcer passes before merge.
6. **Record** the date, findings and status in `docs/claude/security-log.md`, one line per finding, with no secret values.
