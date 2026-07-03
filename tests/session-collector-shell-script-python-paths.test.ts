import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script Python path bindings', () => {
  it('captures Python open write targets when the path is a string variable', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-binding-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          "p = 'tsconfig.json'",
          'content = """{\\n  \\"ok\\": true\\n}\\n"""',
          "open(p, 'w').write(content)",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['tsconfig.json', 3]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures Python open write targets with path variables and expression content as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-path-expression-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'import json',
          "p = 'tsconfig.json'",
          'data = json.load(open(p))',
          'open(p, \'w\').write(json.dumps(data, indent=2) + "\\n")',
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added])).toEqual([
        ['tsconfig.json', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
