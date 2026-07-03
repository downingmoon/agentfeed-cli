import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Antigravity file edit evidence', () => {
  const fixture = useSessionCollectorFixture();

  it('does not count Antigravity code action rows with error text as changed files', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-error-text-code-action.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Edit files</USER_REQUEST>' },
      { step_index: 1, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:20Z', content: `Modified file file://${join(dir, 'src', 'error-text.ts')}\nError: file not found` },
      { step_index: 2, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: `Modified file file://${join(dir, 'src', 'api.ts')}` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified' }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/error-text.ts');
    expect(metrics?.files_changed).toBe(1);
  });
});
