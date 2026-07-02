import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script file evidence', () => {
  it('captures Python pathlib write_text targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          "Path('src/generated.ts').write_text('export const first = true;\\nexport const second = true;\\n')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Node writeFileSync targets with line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-node-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "node - <<'JS'",
          "import { writeFileSync } from 'node:fs';",
          "writeFileSync('src/generated-node.ts', 'export const first = true;\\nexport const second = true;\\n');",
          'JS'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'src/generated-node.ts', status: 'modified', lines_added: 2 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
