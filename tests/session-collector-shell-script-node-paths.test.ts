import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Node path bindings', () => {
  it('captures Node writeFileSync targets when the path is a string variable', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-path-binding-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'NODE'",
          "const fs = require('node:fs');",
          "const path = 'package.json';",
          "const content = '{\\n  \"ok\": true\\n}\\n';",
          'fs.writeFileSync(path, content);',
          'NODE'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['package.json', 3]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node writeFileSync targets with path variables and expression content as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-path-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'NODE'",
          "const fs = require('node:fs');",
          "const path = 'package.json';",
          "const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));",
          "fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');",
          'NODE'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['package.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node path.join writes when the base path is bound from path.resolve', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-join-path-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'NODE'",
          "const fs = require('fs');",
          "const path = require('path');",
          "const out = path.resolve('.omo/evidence/carrot-integration-manual-qa');",
          "const content = 'export const first = true;\nexport const second = true;\n';",
          "fs.writeFileSync(path.join(out, 'browser-ui-scenarios.json'), JSON.stringify([{ ok: true }], null, 2));",
          "await fs.promises.writeFile(path.join(out, 'generated-summary.ts'), content, 'utf8');",
          'NODE'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['.omo/evidence/carrot-integration-manual-qa/browser-ui-scenarios.json', null],
        ['.omo/evidence/carrot-integration-manual-qa/generated-summary.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

});
