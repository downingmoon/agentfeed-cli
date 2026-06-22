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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-'));
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

// P0: collection window filtering keeps long-lived sessions from over-counting old work.
describe('collection window filtering', () => {
  it('auto-slices Claude, Codex, and Gemini sessions after a long idle gap', async () => {
    const claudeSessionFile = join(dir, 'claude-idle-gap-session.jsonl');
    await writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const codexSessionFile = join(dir, 'codex-idle-gap-session.jsonl');
    await writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-idle-gap-session', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'old-codex.ts')]: { type: 'add', content: 'export const oldCodex = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'new-codex.ts')]: { type: 'add', content: 'export const newCodex = true;\n' }
      } } }
    ]);

    const geminiSessionFile = join(dir, 'gemini-idle-gap-session.jsonl');
    await writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-idle-gap-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:02:00Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:02:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const claude = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile: claudeSessionFile });
    const codex = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile: codexSessionFile });
    const gemini = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile: geminiSessionFile });

    expect(claude?.tokens_used).toBe(15);
    expect(claude?.changed_files.map((file) => file.path)).toEqual(['src/new-claude.ts']);
    expect(claude?.collection_window?.since).toBe('2026-05-20T01:00:00.000Z');

    expect(codex?.session_id).toBe('codex-idle-gap-session');
    expect(codex?.tokens_used).toBe(65);
    expect(codex?.changed_files.map((file) => file.path)).toEqual(['src/new-codex.ts']);
    expect(codex?.collection_window?.since).toBe('2026-05-20T01:01:00.000Z');

    expect(gemini?.tokens_used).toBe(15);
    expect(gemini?.changed_files.map((file) => file.path)).toEqual(['src/new-gemini.ts']);
    expect(gemini?.collection_window?.since).toBe('2026-05-20T01:00:00.000Z');
  });

  it('ignores agent session files with no rows inside the collection window', async () => {
    const claudeSessionFile = join(dir, 'claude-outside-window.jsonl');
    await writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-outside-window', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } }
    ]);
    const codexSessionFile = join(dir, 'codex-outside-window.jsonl');
    await writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-outside-window', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 50 } } } }
    ]);
    const geminiSessionFile = join(dir, 'gemini-outside-window.jsonl');
    await writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-outside-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile: claudeSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile: codexSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile: geminiSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
  });

  it('filters Claude metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(dir, 'claude-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'assistant', cwd: dir, sessionId: 'claude-window-session', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: dir, sessionId: 'claude-window-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(dir, 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('claude-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-claude.ts']);
  });

  it('filters Gemini metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(dir, 'gemini-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-window-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(dir, 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-gemini.ts']);
  });

  it('clamps Gemini session duration to --since collection window', async () => {
    const sessionFile = join(dir, 'gemini-duration-window.jsonl');
    await writeJsonl(sessionFile, [
      { sessionId: 'gemini-duration-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T01:20:00Z', kind: 'main' },
      { id: 'g-new', timestamp: '2026-05-20T01:10:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-duration-window');
    expect(metrics?.duration_seconds).toBe(1200);
  });

  it('filters Codex metrics and file edits before --since while preserving session identity', async () => {
    const sessionFile = join(dir, 'codex-window-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-window-session', cwd: dir } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 50 } } } },
      { timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'old.ts')]: { type: 'add', content: 'export const oldWork = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 10, output_tokens: 5 } } } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'new.ts')]: { type: 'add', content: 'export const newWork = true;\nexport const stillNew = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('codex-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new.ts']);
    expect(metrics?.lines_added).toBe(2);
  });

  it('excludes timestamp-less Codex edit rows when an explicit since window is active', async () => {
    const sessionFile = join(dir, 'codex-window-missing-timestamp.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-window-missing-timestamp', cwd: dir } },
      { type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'untimestamped.ts')]: { type: 'add', content: 'export const stale = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:00:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'fresh.ts')]: { type: 'add', content: 'export const fresh = true;\n' }
      } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('codex-window-missing-timestamp');
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/fresh.ts']);
    expect(metrics?.lines_added).toBe(1);
  });

  it('subtracts the pre-window Codex cumulative token baseline', async () => {
    const sessionFile = join(dir, 'codex-cumulative-token-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-cumulative-token-window', cwd: dir } },
      { timestamp: '2026-05-20T00:59:59Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T01:10:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 180 } } } },
      { timestamp: '2026-05-20T01:20:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('codex-cumulative-token-window');
    expect(metrics?.tokens_used).toBe(65);
  });

  it('does not let cumulative OMX token metadata override a windowed Codex delta', async () => {
    await mkdir(join(dir, '.omx'), { recursive: true });
    await writeFile(join(dir, '.omx', 'metrics.json'), JSON.stringify({ session_total_tokens: 1000 }));
    const sessionFile = join(dir, 'codex-omx-cumulative-token-window.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-omx-cumulative-token-window', cwd: dir } },
      { timestamp: '2026-05-20T00:59:59Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T01:10:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(65);
    expect(metrics?.collection_sources).toContainEqual({ type: 'plugin_metadata', name: 'omx', quality: 'medium' });
  });
});
