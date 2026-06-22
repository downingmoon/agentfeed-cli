import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics, sessionFileBelongsToProject } from '../src/collectors/agent-session.js';

let dir: string;
const oldSessionFileMaxBytes = process.env.AGENTFEED_SESSION_FILE_MAX_BYTES;
const oldSessionJsonlMaxRows = process.env.AGENTFEED_SESSION_JSONL_MAX_ROWS;
const oldSessionJsonlMaxLineChars = process.env.AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-file-guardrails-'));
  delete process.env.AGENTFEED_SESSION_FILE_MAX_BYTES;
  delete process.env.AGENTFEED_SESSION_JSONL_MAX_ROWS;
  delete process.env.AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS;
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  if (oldSessionFileMaxBytes === undefined) delete process.env.AGENTFEED_SESSION_FILE_MAX_BYTES;
  else process.env.AGENTFEED_SESSION_FILE_MAX_BYTES = oldSessionFileMaxBytes;
  if (oldSessionJsonlMaxRows === undefined) delete process.env.AGENTFEED_SESSION_JSONL_MAX_ROWS;
  else process.env.AGENTFEED_SESSION_JSONL_MAX_ROWS = oldSessionJsonlMaxRows;
  if (oldSessionJsonlMaxLineChars === undefined) delete process.env.AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS;
  else process.env.AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS = oldSessionJsonlMaxLineChars;
  await rm(dir, { recursive: true, force: true });
});

describe('agent session file guardrails', () => {
  it('rejects oversized explicit agent session files before parsing', async () => {
    process.env.AGENTFEED_SESSION_FILE_MAX_BYTES = '128';
    const sessionFile = join(dir, 'oversized-codex-session.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'oversized-codex-session', cwd: dir } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_tokens: 9999 }, padding: 'x'.repeat(256) } }
    ]);

    await expect(sessionFileBelongsToProject(sessionFile, dir)).resolves.toBe(false);
    await expect(collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile })).resolves.toBeNull();
  });

  it('skips pathological JSONL lines while keeping bounded valid session identity', async () => {
    process.env.AGENTFEED_SESSION_JSONL_MAX_LINE_CHARS = '512';
    const sessionFile = join(dir, 'huge-line-codex-session.jsonl');
    await writeFile(sessionFile, [
      JSON.stringify({ timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'huge-line-codex-session', cwd: dir } }),
      JSON.stringify({ timestamp: '2026-05-20T00:00:01Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: { [join(dir, 'src', 'too-large.ts')]: { type: 'add', content: 'x'.repeat(500) } } } }),
      ''
    ].join('\n'));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.session_id).toBe('huge-line-codex-session');
    expect(metrics?.changed_files).toEqual([]);
  });

  it('keeps the newest JSONL rows when a long Codex session exceeds the row cap', async () => {
    process.env.AGENTFEED_SESSION_JSONL_MAX_ROWS = '2';
    const sessionFile = join(dir, 'codex-long-row-capped.jsonl');
    const recentPath = join(dir, 'src', 'recent-row-cap.ts');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T00:00:00Z', type: 'session_meta', payload: { id: 'codex-long-row-capped', cwd: dir, model: 'gpt-old' } },
      { timestamp: '2026-05-20T00:00:01Z', type: 'event_msg', payload: { type: 'token_count', info: { total_tokens: 10 } } },
      { timestamp: '2026-05-20T00:05:00Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'final' } },
      {
        timestamp: '2026-05-20T00:05:01Z',
        type: 'event_msg',
        payload: {
          type: 'patch_apply_end',
          changes: {
            [recentPath]: {
              type: 'add',
              unified_diff: '--- /dev/null\n+++ b/src/recent-row-cap.ts\n@@\n+export const recent = true;\n'
            }
          }
        }
      }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path)).toContain('src/recent-row-cap.ts');
    expect(metrics?.collection_sources).toContainEqual({ type: 'agent_session', name: 'codex', quality: 'high' });
  });

  it('reads the tail of oversized Codex session files instead of silently dropping agent evidence', async () => {
    process.env.AGENTFEED_SESSION_FILE_MAX_BYTES = '2048';
    const sessionFile = join(dir, 'codex-oversized-tail.jsonl');
    const recentPath = join(dir, 'src', 'recent-tail.ts');
    const oversizedPrefix = `${'x'.repeat(4096)}\n`;
    const tailRows = [
      JSON.stringify({ timestamp: '2026-05-20T00:05:00Z', type: 'event_msg', payload: { type: 'agent_message', phase: 'final' } }),
      JSON.stringify({
        timestamp: '2026-05-20T00:05:01Z',
        type: 'event_msg',
        payload: {
          type: 'patch_apply_end',
          changes: {
            [recentPath]: {
              type: 'add',
              unified_diff: '--- /dev/null\n+++ b/src/recent-tail.ts\n@@\n+export const recentTail = true;\n'
            }
          }
        }
      }),
    ].join('\n');
    await writeFile(sessionFile, `${oversizedPrefix}${tailRows}\n`);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.changed_files.map((file) => file.path)).toContain('src/recent-tail.ts');
    expect(metrics?.collection_quality).toBe('high');
  });

});
