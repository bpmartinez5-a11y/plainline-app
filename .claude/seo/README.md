# claude-seo (Plainline copy)

Installed 2026-11-04 (Ben: "Install claude-seo"). Source: https://github.com/AgriciDaniel/claude-seo at commit 6be93f45064ffbadced572b5d5c95f55fd263af0 (v2.5.0). License: MIT, kept in `LICENSE` here. The-enforcer report: `security/enforcer/2026-10-31-claude-seo.md` in the project files, plus the install note dated 2026-11-04.

## What is here
- Skills: `.claude/skills/seo-local`, `seo-schema`, `seo-geo`, `seo-technical`, `seo-page`. Copied as they are, with one change: the plugin launcher is replaced by `python3 .claude/seo/scripts/<script>.py`.
- Scripts: `scripts/` holds the 7 scripts these skills call (`parse_html`, `sitemap_discovery`, `agentic_check`, `fetch_page`, `url_safety`, `metadata_template`, `seo_updates`). `data/google-updates.json` feeds `seo_updates`.
- `requirements.txt`: exact versions. These are already in the cloud container, so normally there is nothing to install.

## Rules (they win over the skill files)
1. Run it only in this repo. Never install the plugin, its `install.sh`, its hooks or its extensions.
2. No keys. Do not set Google, DataForSEO, Ahrefs or other vendor keys. Skip every step that needs one.
3. On a site Plainline does not own, never use `agentic_check.py --ua-matrix`, `fetch_page.py --googlebot` or `--user-agent`, or a Googlebot comparison. They pretend to be a crawler.
4. Scripts that are not in `scripts/` are not installed: `render_page.py`, `agent_ux_check.py`, `pagespeed_check.py`, `crux_history.py`, `gsc_inspect.py` and the rest. Skip the steps that name them. Links to other claude-seo skills (seo-images, seo-agentic and others) also point to nothing here.
5. Never run the full multi-agent audit. Use one skill at a time.
6. The sandbox network blocks most sites. Fetch public pages through Firecrawl, save them, and serve the copy on 127.0.0.1 for the scripts. For Plainline's own site, serve this repo: `python3 -m http.server 8765 --bind 127.0.0.1`, then run the scripts with `CLAUDE_SEO_LOCAL_TARGETS=127.0.0.1:8765 NO_PROXY=127.0.0.1`.
7. Recommend only. Never ping IndexNow or a search engine, never submit to directories or data aggregators, and never change a live site.
8. Set `CLAUDE_SEO_LOCAL_TARGETS` only to the 127.0.0.1 copy of rule 6, never to any other host.
9. Reports are internal. Prices and client data stay out of them (CLAUDE.md hard rules).

## Refresh
Copy the same files from a newer reviewed commit, run the-enforcer on the diff, then update the commit above.
