import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

const fixture = useSessionCollectorFixture();

// P0: collection window filtering keeps long-lived sessions from over-counting old work.
describe('collection window filtering', () => {
  it('auto-slices Claude, Codex, and Gemini sessions after a long idle gap', async () => {
    const claudeSessionFile = join(fixture.dir(), 'claude-idle-gap-session.jsonl');
    await fixture.writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: fixture.dir(), sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T00:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(fixture.dir(), 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: fixture.dir(), sessionId: 'claude-idle-gap-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(fixture.dir(), 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const codexSessionFile = join(fixture.dir(), 'codex-idle-gap-session.jsonl');
    await fixture.writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-idle-gap-session', cwd: fixture.dir() } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(fixture.dir(), 'src', 'old-codex.ts')]: { type: 'add', content: 'export const oldCodex = true;\n' }
      } } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } },
      { timestamp: '2026-05-20T01:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(fixture.dir(), 'src', 'new-codex.ts')]: { type: 'add', content: 'export const newCodex = true;\n' }
      } } }
    ]);

    const geminiSessionFile = join(fixture.dir(), 'gemini-idle-gap-session.jsonl');
    await fixture.writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-idle-gap-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:02:00Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:02:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(fixture.dir(), 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(fixture.dir(), 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const claude = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'claude_code', sessionFile: claudeSessionFile });
    const codex = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'codex', sessionFile: codexSessionFile });
    const gemini = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'gemini_cli', sessionFile: geminiSessionFile });

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
    const claudeSessionFile = join(fixture.dir(), 'claude-outside-window.jsonl');
    await fixture.writeJsonl(claudeSessionFile, [
      { type: 'assistant', cwd: fixture.dir(), sessionId: 'claude-outside-window', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(fixture.dir(), 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } }
    ]);
    const codexSessionFile = join(fixture.dir(), 'codex-outside-window.jsonl');
    await fixture.writeJsonl(codexSessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-outside-window', cwd: fixture.dir() } },
      { timestamp: '2026-05-20T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: 100, output_tokens: 50 } } } }
    ]);
    const geminiSessionFile = join(fixture.dir(), 'gemini-outside-window.jsonl');
    await fixture.writeJsonl(geminiSessionFile, [
      { sessionId: 'gemini-outside-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(fixture.dir(), 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] }
    ]);

    await expect(collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'claude_code', sessionFile: claudeSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'codex', sessionFile: codexSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
    await expect(collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'gemini_cli', sessionFile: geminiSessionFile, since: '2026-05-20T01:00:00Z' })).resolves.toBeNull();
  });

  it('filters Claude metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(fixture.dir(), 'claude-window-session.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { type: 'assistant', cwd: fixture.dir(), sessionId: 'claude-window-session', timestamp: '2026-05-20T00:59:59Z', message: { model: 'claude-sonnet', usage: { input_tokens: 100, output_tokens: 50 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(fixture.dir(), 'src', 'old-claude.ts'), content: 'export const oldClaude = true;\n' } }
      ] } },
      { type: 'assistant', cwd: fixture.dir(), sessionId: 'claude-window-session', timestamp: '2026-05-20T01:00:00Z', message: { model: 'claude-sonnet', usage: { input_tokens: 10, output_tokens: 5 }, content: [
        { type: 'tool_use', name: 'Write', input: { file_path: join(fixture.dir(), 'src', 'new-claude.ts'), content: 'export const newClaude = true;\n' } }
      ] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'claude_code', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('claude-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-claude.ts']);
  });

  it('filters Gemini metrics and edits before --since inclusively at the boundary', async () => {
    const sessionFile = join(fixture.dir(), 'gemini-window-session.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { sessionId: 'gemini-window-session', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T00:59:59Z', kind: 'main' },
      { id: 'g-old', timestamp: '2026-05-20T00:59:59Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 100 }, toolCalls: [
        { id: 'tool-old', name: 'write_file', status: 'success', args: { file_path: join(fixture.dir(), 'src', 'old-gemini.ts'), content: 'export const oldGemini = true;\n' } }
      ] },
      { id: 'g-new', timestamp: '2026-05-20T01:00:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [
        { id: 'tool-new', name: 'write_file', status: 'success', args: { file_path: join(fixture.dir(), 'src', 'new-gemini.ts'), content: 'export const newGemini = true;\n' } }
      ] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-window-session');
    expect(metrics?.tokens_used).toBe(15);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/new-gemini.ts']);
  });

  it('clamps Gemini session duration to --since collection window', async () => {
    const sessionFile = join(fixture.dir(), 'gemini-duration-window.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { sessionId: 'gemini-duration-window', startTime: '2026-05-20T00:00:00Z', lastUpdated: '2026-05-20T01:20:00Z', kind: 'main' },
      { id: 'g-new', timestamp: '2026-05-20T01:10:00Z', type: 'gemini', model: 'gemini-3-flash-preview', tokens: { total: 15 }, toolCalls: [] }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: fixture.dir(), source: 'gemini_cli', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.session_id).toBe('gemini-duration-window');
    expect(metrics?.duration_seconds).toBe(1200);
  });

});
