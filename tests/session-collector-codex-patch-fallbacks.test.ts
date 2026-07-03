import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

describe('Codex patch fallback evidence', () => {
  const fixture = useSessionCollectorFixture();

  it('does not count unconfirmed Codex function_call apply_patch fallbacks as changed files', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-unconfirmed-function-apply-patch.jsonl');
    const unconfirmedPatch = [
      '*** Begin Patch',
      '*** Add File: src/unconfirmed-function-patch.ts',
      '+export const unconfirmed = true;',
      '*** End Patch'
    ].join('\n');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-unconfirmed-function-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'functions.apply_patch', arguments: unconfirmedPatch, call_id: 'patch-unconfirmed' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'api.ts')]: { type: 'update', unified_diff: '@@\n-export const ok = true;\n+export const ok = false;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/api.ts', status: 'modified', lines_added: 1, lines_removed: 1 }
    ]);
    expect(metrics?.changed_files.map((file) => file.path)).not.toContain('src/unconfirmed-function-patch.ts');
    expect(metrics?.files_changed).toBe(1);
  });
});
