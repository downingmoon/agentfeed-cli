import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script in-place edit evidence', () => {
  it('captures sed and perl in-place edit file targets as changed files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-inplace-edits-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "sed -i 's/export const ok = true/export const ok = false/' src/api.ts",
          "sed -i.bak -e 's/old/new/' 'src/config.ts'",
          "perl -0pi -e 's/export export const worklogMetrics/export const worklogMetrics/' src/lib/search-explore-response-fixtures.ts",
          "perl -0pi -e 's/styles\\.([A-Za-z_][A-Za-z0-9_]*)/styles[\"$1\"]/g' \"$f\""
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.lines_added]).sort()).toEqual([
        ['src/api.ts', null],
        ['src/config.ts', null],
        ['src/lib/search-explore-response-fixtures.ts', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
