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

  it('counts confirmed Codex function_call apply_patch fallback changes when patch_apply_end is absent', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-confirmed-function-apply-patch.jsonl');
    const confirmedPatch = [
      '*** Begin Patch',
      '*** Add File: src/confirmed-function-patch.ts',
      '+export const confirmed = true;',
      '+export const lineCount = 2;',
      '*** End Patch'
    ].join('\n');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-confirmed-function-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'functions.apply_patch', arguments: JSON.stringify({ input: confirmedPatch }), call_id: 'patch-confirmed' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'patch-confirmed', output: 'Success. Updated the following files:\nA src/confirmed-function-patch.ts' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files).toMatchObject([
      { path: 'src/confirmed-function-patch.ts', status: 'added', lines_added: 2, lines_removed: 0 }
    ]);
    expect(metrics?.files_changed).toBe(1);
    expect(metrics?.lines_added).toBe(2);
    expect(metrics?.tool_calls).toBe(1);
  });

  it('counts multiple confirmed parallel apply_patch fallback changes from one output row', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-parallel-multi-apply-patch.jsonl');
    const firstPatch = [
      '*** Begin Patch',
      '*** Add File: src/parallel-first.ts',
      '+export const first = true;',
      '*** End Patch'
    ].join('\n');
    const secondPatch = [
      '*** Begin Patch',
      '*** Add File: src/parallel-second.ts',
      '+export const second = true;',
      '+export const secondLine = true;',
      '*** End Patch'
    ].join('\n');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-parallel-multi-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'multi_tool_use.parallel', arguments: JSON.stringify({
        tool_uses: [
          { recipient_name: 'functions.apply_patch', parameters: { input: firstPatch } },
          { recipient_name: 'functions.apply_patch', parameters: { input: secondPatch } }
        ]
      }), call_id: 'parallel-patches' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'parallel-patches', output: 'Success. Updated the following files:\nA src/parallel-first.ts\nA src/parallel-second.ts' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => [file.path, file.status, file.lines_added]).sort()).toEqual([
      ['src/parallel-first.ts', 'added', 1],
      ['src/parallel-second.ts', 'added', 2]
    ]);
    expect(metrics?.files_changed).toBe(2);
    expect(metrics?.lines_added).toBe(3);
    expect(metrics?.tool_calls).toBe(2);
  });


  it('does not count parallel apply_patch fallbacks when the shared output row failed', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-parallel-failed-apply-patch.jsonl');
    const firstPatch = [
      '*** Begin Patch',
      '*** Add File: src/parallel-phantom-first.ts',
      '+export const first = true;',
      '*** End Patch'
    ].join('\n');
    const secondPatch = [
      '*** Begin Patch',
      '*** Add File: src/parallel-phantom-second.ts',
      '+export const second = true;',
      '*** End Patch'
    ].join('\n');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-parallel-failed-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'function_call', name: 'multi_tool_use.parallel', arguments: JSON.stringify({
        tool_uses: [
          { recipient_name: 'functions.apply_patch', parameters: { input: firstPatch } },
          { recipient_name: 'functions.apply_patch', parameters: { input: secondPatch } }
        ]
      }), call_id: 'parallel-failed-patches' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'parallel-failed-patches', status: 'failed', output: 'Patch failed: invalid context' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.lines_added).toBeNull();
    expect(metrics?.tool_calls).toBe(2);
  });


});
