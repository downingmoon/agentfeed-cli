import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { useSessionCollectorFixture } from './session-collector-window-helpers.js';

const fixture = useSessionCollectorFixture();

describe('Codex collection window filtering', () => {
  it('filters Codex metrics and file edits before --since while preserving session identity', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-window-session.jsonl');
    await fixture.writeJsonl(sessionFile, [
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
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-window-missing-timestamp.jsonl');
    await fixture.writeJsonl(sessionFile, [
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
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-cumulative-token-window.jsonl');
    await fixture.writeJsonl(sessionFile, [
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
    const dir = fixture.dir();
    await mkdir(join(dir, '.omx'), { recursive: true });
    await writeFile(join(dir, '.omx', 'metrics.json'), JSON.stringify({ session_total_tokens: 1000 }));
    const sessionFile = join(dir, 'codex-omx-cumulative-token-window.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-omx-cumulative-token-window', cwd: dir } },
      { timestamp: '2026-05-20T00:59:59Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 150 } } } },
      { timestamp: '2026-05-20T01:10:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 215 } } } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z' });

    expect(metrics?.tokens_used).toBe(65);
    expect(metrics?.collection_sources).toContainEqual({ type: 'plugin_metadata', name: 'omx', quality: 'medium' });
  });
});
