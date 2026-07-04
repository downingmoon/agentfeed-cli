import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-codex-patch-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('Codex session collector patch metrics', () => {
  it('extracts Codex patch files, line counts, tokens, and failed commands from a session file', async () => {
    const sessionFile = join(dir, 'codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-session-1', cwd: dir } },
      { timestamp: '2026-05-20T00:00:05Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 40, cached_input_tokens: 10, output_tokens: 20 } } } },
      { timestamp: '2026-05-20T00:00:10Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'call-test' } },
      { timestamp: '2026-05-20T00:00:11Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'call-test', output: 'Process exited with code 1\nFAIL tests/api.test.ts' } },
      { timestamp: '2026-05-20T00:00:12Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'api.ts')]: { type: 'update', unified_diff: '@@\n-export const ok = true;\n+export const ok = false;\n+export const changed = true;\n' },
        [join(dir, 'README.md')]: { type: 'add', content: '# AgentFeed\n\nCodex session support\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('codex-session-1');
    expect(metrics?.tokens_used).toBe(70);
    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(0);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['README.md', 'src/api.ts']);
    expect(metrics?.lines_added).toBe(5);
    expect(metrics?.lines_removed).toBe(1);
  });

  it('extracts Codex model from turn_context rows when session_meta omits it', async () => {
    const sessionFile = join(dir, 'codex-turn-context-model.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-turn-context-model', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'turn_context', payload: { cwd: dir, model: 'gpt-5.5', effort: 'high' } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'model.ts')]: { type: 'add', content: 'export const model = true;\\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('codex-turn-context-model');
    expect(metrics?.model).toBe('gpt-5.5');
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/model.ts']);
  });

  it('uses the first in-window Codex turn_context model for partial collection windows', async () => {
    const sessionFile = join(dir, 'codex-window-model.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-window-model', cwd: dir, model: 'gpt-5.4-mini' } },
      { timestamp: '2026-05-20T00:30:00Z', type: 'turn_context', payload: { cwd: dir, model: 'gpt-5.4-mini', effort: 'medium' } },
      { timestamp: '2026-05-20T01:00:00Z', type: 'turn_context', payload: { cwd: dir, model: 'gpt-5.5', effort: 'high' } },
      { timestamp: '2026-05-20T01:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 115 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.model).toBe('gpt-5.5');
    expect(metrics?.tokens_used).toBe(115);
  });

  it('falls back to Codex apply_patch custom tool input when patch_apply_end is absent', async () => {
    const sessionFile = join(dir, 'codex-apply-patch-only.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-apply-patch-only', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'patch-only', input: [
        '*** Begin Patch',
        `*** Update File: ${join(dir, 'src', 'api.ts')}`,
        '@@',
        '-export const ok = true;',
        '+export const ok = false;',
        '+export const patched = true;',
        `*** Add File: ${join(dir, 'src', 'created.ts')}`,
        '+export const created = true;',
        '*** End Patch'
      ].join('\n') } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/api.ts', 'src/created.ts']);
    expect(metrics?.lines_added).toBe(3);
    expect(metrics?.lines_removed).toBe(1);
    expect(metrics?.tool_calls).toBe(1);
  });

  it('does not count failed Codex apply_patch custom tool input as changed files', async () => {
    const sessionFile = join(dir, 'codex-failed-apply-patch.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-failed-apply-patch', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'failed', call_id: 'failed-patch', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'failed-patch.ts')}`,
        '+export const failedPatch = true;',
        '*** End Patch'
      ].join('\n') } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
  });

  it('does not count Codex apply_patch fallback when the paired tool output failed', async () => {
    const sessionFile = join(dir, 'codex-apply-patch-output-failed.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-apply-patch-output-failed', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'patch-output-failed', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'phantom.ts')}`,
        '+export const phantom = true;',
        '*** End Patch'
      ].join('\n') } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'patch-output-failed', status: 'failed', output: 'Patch failed: file not found' } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tool_calls).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
  });

  it('keeps Codex apply_patch fallback files that do not appear in structured patch_apply_end changes', async () => {
    const sessionFile = join(dir, 'codex-mixed-patch-evidence.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-mixed-patch-evidence', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'fallback-patch', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'fallback-only.ts')}`,
        '+export const fallbackOnly = true;',
        '*** End Patch'
      ].join('\n') } },
      { timestamp: '2026-05-20T00:00:02Z', type: 'response_item', payload: { type: 'custom_tool_call', name: 'apply_patch', status: 'completed', call_id: 'structured-patch', input: [
        '*** Begin Patch',
        `*** Add File: ${join(dir, 'src', 'structured.ts')}`,
        '+export const structured = true;',
        '*** End Patch'
      ].join('\n') } },
      { timestamp: '2026-05-20T00:00:03Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'structured.ts')]: { type: 'add', content: 'export const structured = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path).sort()).toEqual(['src/fallback-only.ts', 'src/structured.ts']);
    expect(metrics?.lines_added).toBe(2);
    expect(metrics?.tool_calls).toBe(2);
  });

});
