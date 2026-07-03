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

  it('captures deterministic install file targets without claiming source changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-install-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'install -m 0644 src/api.ts dist/api.ts',
          'install --mode 0644 src/api.ts dist/api-mode.ts',
          'install -D "src/old name.ts" dist/nested/new-name.ts',
          'install -d dist/nested',
          'install -t dist src/a.ts src/b.ts'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['dist/api-mode.ts', 'modified', null],
        ['dist/api.ts', 'modified', null],
        ['dist/nested/new-name.ts', 'modified', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures deterministic git restore and checkout file targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-git-restore-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'git restore src/api.ts "src/old name.ts"',
          'git restore --source HEAD~1 -- src/config.ts',
          'git checkout -- package.json',
          'git checkout HEAD~1 -- src/from-head.ts',
          'git checkout main',
          'git restore .'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['package.json', 'modified', null],
        ['src/api.ts', 'modified', null],
        ['src/config.ts', 'modified', null],
        ['src/from-head.ts', 'modified', null],
        ['src/old name.ts', 'modified', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
