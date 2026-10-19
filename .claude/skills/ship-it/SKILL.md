---
name: ship-it
description: "DevOps and deployment for Plainline on Vercel. Covers the review gate, deploy workflow, CI checks, monitoring and logging, reliability, rollback and a production checklist. Use before merging a PR or setting up a new client site."
---
# Ship it (Vercel)

Plainline runs on Vercel: static pages plus serverless functions in `api/`. Vercel handles servers and scaling, so there's no Docker or Kubernetes here. Add containers only if a workload ever can't run as a Vercel function.

**How deploys work**
- Every pull request gets a Vercel Preview deployment. Test there.
- Open PRs against `main`, not the GitHub default branch (check with `git ls-remote --symref origin HEAD`; if it isn't `main`, still target `main` unless Ben says otherwise). Confirm the production branch in Vercel → Project → Settings → Git before the first merge.
- Rollback: Vercel → Deployments → pick the last good one → Promote (or `vercel rollback`). It's instant, so prefer it to a hotfix under pressure.

**Review gate (from `CLAUDE.md`)**
1. Put the tier at the top of the PR body:
   - **Low**: copy, images, styles, docs
   - **Medium**: pages, layout, demo behavior
   - **High**: anything in `api/`, forms, bookings, payments, keys, the AI disclosure, client domains
2. `reviewer` (fresh eyes) reviews the diff, then `refuter` tries to prove each finding wrong. Fix only verified findings, with three rounds at most.
3. High tier: `security-auditor` has no verified critical or high findings, the-enforcer passes, and Ben approves. Medium: Ben approves. Low: checks green; Ben merges.
4. Attach the evidence to the PR: command output, and screenshots at 400px and desktop.

**Pre-merge checklist**
1. `node --check` passes for every file in `api/`.
2. On the Preview:
   - The home page, demo and Studio load at 400px and on desktop.
   - The demo replies, and fallback works (replies still come with AI off).
   - Studio rejects a wrong key with 401.
3. `vercel.json` is valid JSON. The `book.plainlineops.com` redirect and the security headers are unchanged unless intended.
4. Env vars exist in Vercel Production, never in code: `ANTHROPIC_API_KEY`, `STUDIO_KEY`, and optionally `ANTHROPIC_MODEL` and `STUDIO_MODEL`. (The Supabase publishable key in `index.html` is public by design; its safety is the `leads` table's row-level security.)
5. The Anthropic API key has a spend limit set in the Console.
6. No Plainline price appears on any client-facing page.

**CI (optional, add when there's more code):** a GitHub Action that runs `node --check` on `api/*.js` and validates `vercel.json`. Vercel's own build check already gates deploys.

**Monitoring:**
- Vercel runtime logs for `/api/*`: watch 502, 429 and 401 rates.
- Vercel Analytics for page speed.
- An uptime check on `/` and `GET /api/chat` (returns `{ai:true}`), using a free monitor that emails Ben.

**After deploy:** open production, send one demo message, and confirm the reply. Note the deployment in the PR. If anything broke, roll back first, then add it as an incident eval case (Constellation star `evals`).
