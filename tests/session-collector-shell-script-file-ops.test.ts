import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script file operation evidence', () => {
  it('captures deterministic rm and mv file targets without line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-ops-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'rm components/MobileFloatingCta.tsx',
          'rm -f src/obsolete.ts',
          'rm -rf scripts/__pycache__ tests/__pycache__',
          'git mv .github/workflows/ci.yml .github/workflows/ci.yml.disabled',
          'mv "src/old name.ts" src/new-name.ts'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['.github/workflows/ci.yml', 'deleted', null],
        ['.github/workflows/ci.yml.disabled', 'renamed', null],
        ['components/MobileFloatingCta.tsx', 'deleted', null],
        ['src/new-name.ts', 'renamed', null],
        ['src/obsolete.ts', 'deleted', null],
        ['src/old name.ts', 'deleted', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures deterministic cp file targets without claiming source changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-cp-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'cp package.json package.json.bak',
          'cp -f "src/old name.ts" src/new-name.ts',
          'cp --force src/api.ts src/api-copy.ts',
          'cp -R templates generated',
          'cp src/a.ts src/b.ts src/out'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['package.json.bak', 'modified', null],
        ['src/api-copy.ts', 'modified', null],
        ['src/new-name.ts', 'modified', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
