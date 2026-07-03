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

  it('captures deterministic ln file targets without claiming source changes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-ln-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'ln src/api.ts src/api-hardlink.ts',
          'ln -s ../target.ts src/link.ts',
          'ln -sf src/api.ts src/api-link.ts',
          'ln --symbolic --force src/config.ts src/config-link.ts',
          'ln -s src/a.ts src/b.ts links/',
          'ln -t links src/a.ts src/b.ts'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['src/api-hardlink.ts', 'modified', null],
        ['src/api-link.ts', 'modified', null],
        ['src/config-link.ts', 'modified', null],
        ['src/link.ts', 'modified', null]
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

  it('captures deterministic touch file targets without line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-touch-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'touch src/generated.ts "src/old name.ts"',
          'touch -c package.json',
          'touch -r src/api.ts src/copied-time.ts',
          'touch --date "2026-07-03 00:00:00" src/dated.ts',
          'touch .'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['package.json', 'modified', null],
        ['src/copied-time.ts', 'modified', null],
        ['src/dated.ts', 'modified', null],
        ['src/generated.ts', 'modified', null],
        ['src/old name.ts', 'modified', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('captures deterministic chmod and owner file targets without line counts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-file-mode-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'chmod 755 scripts/deploy.sh "scripts/old deploy.sh"',
          'chmod --reference scripts/ref.sh scripts/copied-mode.sh',
          'chmod -R 755 scripts',
          'chown ubuntu:ubuntu src/api.ts',
          'chgrp staff src/grouped.ts'
        ].join('\n')
      }, files);

      expect([...files.values()].map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
        ['scripts/copied-mode.sh', 'modified', null],
        ['scripts/deploy.sh', 'modified', null],
        ['scripts/old deploy.sh', 'modified', null],
        ['src/api.ts', 'modified', null],
        ['src/grouped.ts', 'modified', null]
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
