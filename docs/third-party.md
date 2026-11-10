# Third-party material

## everything-claude-code (agent prompts)
`.claude/agents/database-reviewer.md`, `silent-failure-hunter.md` and `test-gap-reviewer.md` are adapted from `agents/database-reviewer.md`, `agents/silent-failure-hunter.md` and `agents/pr-test-analyzer.md` in https://github.com/affaan-m/everything-claude-code at commit b38be6a (Oct 29, 2026). Only these three prompts were taken and rewritten to Plainline's rules; nothing else from that repo (installer, hooks, skills, MCP configs) is used.

MIT License

Copyright (c) 2026 Affaan Mustafa

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## claude-seo (SEO skills and scripts)
`.claude/skills/seo-local`, `seo-schema`, `seo-geo`, `seo-technical`, `seo-page` and `.claude/seo/` are copied from https://github.com/AgriciDaniel/claude-seo at commit 6be93f4 (v2.5.0), MIT License, Copyright (c) 2026 agricidaniel. The full license is in `.claude/seo/LICENSE`. Only these 5 skills and 7 scripts are used; the installer, hooks, agents and extensions are not. Rules: `.claude/seo/README.md`.

## Room photos (the glass look's background)
`media/room-day.jpg` and `media/room-night.jpg` are Higgsfield renders made for the glass look on Nov 10, 2026 (the same files as jarvis-app `app/public/media/`): an empty warm room with no people, brands or text. They carry content-credential (C2PA) marks that say they are generated.

## Phosphor Icons (icons in the glass look)
The icon glyphs in the glass theme block (`/*glass*/` … `/*glass-end*/`) of `index.html`, `demo.html`, `studio.html`, `sell.html`, `privacy.html` and `terms.html` are Phosphor Icons 2.1.1, fill and bold weights, from https://github.com/phosphor-icons/core, MIT License, Copyright (c) 2023 Phosphor Icons. They are stamped from jarvis-app `design/icons.json` by `design/glass.py`, which adds only the glyphs a page names and the full MIT notice below; never edit them in the page.

MIT License

Copyright (c) 2023 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
