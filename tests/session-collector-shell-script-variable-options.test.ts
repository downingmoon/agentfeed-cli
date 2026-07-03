import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script variable write options', () => {
  it('captures Python content variable writes with encoding options', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-python-variable-options-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "python3 - <<'PY'",
          'from pathlib import Path',
          'content = """export const first = true;\\nexport const second = true;\\n"""',
          "Path('src/generated-content-variable.ts').write_text(content, encoding='utf-8')",
          "target = Path('src/generated-bound-content-variable.ts')",
          "target.write_text(content, encoding='utf-8')",
          'PY'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/generated-bound-content-variable.ts', 2],
        ['src/generated-content-variable.ts', 2]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
