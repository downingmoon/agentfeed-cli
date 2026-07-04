import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell git output file evidence', () => {
  it('ignores indented source code lines after git status --short output', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-git-status-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: 'git status --short && sed -n "1,20p" src/source.ts',
        output: [
          ' M src/real.ts',
          "    return AGENT_LABELS[agent] ?? agent",
          "    if (key.includes('codex') || key.includes('openai')) return 'codex'",
          '?? src/new.ts'
        ].join('\n')
      }, files);

      expect([...files.keys()]).toEqual(['src/real.ts', 'src/new.ts']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('ignores local runtime paths from shell evidence', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-git-local-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: 'git status --short',
        output: [
          ' M .debug-journal.md',
          ' M .git/info/exclude',
          ' M agentfeed-cli/.git/info/exclude',
          ' M src/real.ts'
        ].join('\n')
      }, files);

      expect([...files.keys()]).toEqual(['src/real.ts']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
