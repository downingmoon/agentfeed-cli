import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell script workdir evidence', () => {
  it('resolves inline cd heredoc writes relative to the changed directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-cd-inline-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          "cd packages/api && cat > src/generated.ts <<'EOF'",
          'export const generated = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'packages/api/src/generated.ts', status: 'modified', lines_added: 1 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('keeps standalone cd context for later shell redirects', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-cd-context-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'cd packages/web',
          "printf '%s\\n' 'export const page = true;' > src/page.ts"
        ].join('\n')
      }, files);

      expect([...files.values()]).toMatchObject([
        { path: 'packages/web/src/page.ts', status: 'modified', lines_added: 1 }
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not attribute writes after cd leaves the project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-cd-outside-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'cd /tmp',
          "cat > outside.ts <<'EOF'",
          'export const outside = true;',
          'EOF'
        ].join('\n')
      }, files);

      expect([...files.values()]).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('does not re-enter project from stale workdir after outside relative cd', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-cd-outside-relative-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: [
          'cd /tmp',
          'cd packages/api',
          "printf '%s\\n' 'export const wrong = true;' > src/wrong.ts"
        ].join('\n')
      }, files);

      expect([...files.values()]).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
