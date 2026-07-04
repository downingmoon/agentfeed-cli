import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ChangedFileSummary } from '../src/types.js';
import { applyShellFileEvidence } from '../src/collectors/agent-session-shell-files.js';

describe('shell in-place edit evidence', () => {
  it('stops sed -i targets before chained cleanup commands', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'agentfeed-shell-sed-chain-'));
    try {
      const files = new Map<string, ChangedFileSummary>();

      applyShellFileEvidence(dir, {
        command: "sed -i.bak '/^\\.debug-journal\\.md$/d' .git/info/exclude && rm -f .git/info/exclude.bak"
      }, files);

      expect([...files.values()]).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
