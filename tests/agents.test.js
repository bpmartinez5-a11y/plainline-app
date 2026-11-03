// Claude Code skips a subagent file with bad frontmatter without any warning,
// and ignores a misspelled field. This test catches both, so a broken
// reviewer or refuter can't quietly drop out of the review gate.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const DIR = path.join(__dirname, '..', '.claude', 'agents');
// Fields from https://code.claude.com/docs/en/sub-agents (frontmatter reference).
const FIELDS = new Set(['name', 'description', 'prompt', 'tools', 'disallowedTools', 'model', 'permissionMode',
  'maxTurns', 'autoCompactWindow', 'skills', 'mcpServers', 'hooks', 'memory', 'background', 'omitClaudeMd',
  'effort', 'isolation', 'color', 'initialPrompt', 'experimental']);
const MODELS = /^(sonnet|opus|haiku|fable|inherit|claude-[a-z0-9.-]+)$/;

for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.md'))) {
  test(`subagent ${file} loads`, () => {
    const lines = fs.readFileSync(path.join(DIR, file), 'utf8').split(/\r?\n/);
    assert.strictEqual(lines[0], '---', 'frontmatter must start on line 1');
    const end = lines.indexOf('---', 1);
    assert.ok(end > 0, 'frontmatter has no closing ---');
    const fm = {};
    for (const line of lines.slice(1, end)) {
      if (!line.trim() || /^\s/.test(line) || line.trim().startsWith('#') || line.trim().startsWith('-')) continue;
      const m = line.match(/^([A-Za-z]+):\s*(.*)$/);
      assert.ok(m, `can't read frontmatter line: ${line}`);
      assert.ok(FIELDS.has(m[1]), `unknown field "${m[1]}" (Claude Code ignores it)`);
      fm[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
    }
    assert.ok(fm.name && !fm.name.startsWith('-') && !fm.name.includes(':') && fm.name.length <= 256, 'bad or missing name');
    assert.ok(fm.description, 'missing description');
    if (fm.model) assert.match(fm.model, MODELS, `unknown model "${fm.model}"`);
  });
}
