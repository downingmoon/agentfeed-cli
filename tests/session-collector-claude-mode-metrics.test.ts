import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';

let dir: string;

async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-claude-mode-'));
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

describe('Claude mode metrics', () => {
  it('extracts Claude mode rows without requiring assistant message payloads', async () => {
    const sessionFile = join(dir, 'claude-mode-session.jsonl');
    await writeJsonl(sessionFile, [
      { type: 'mode', cwd: dir, sessionId: 'claude-mode-session', timestamp: '2026-05-20T00:00:00Z', mode: 'normal' },
      { type: 'assistant', cwd: dir, sessionId: 'claude-mode-session', timestamp: '2026-05-20T00:00:01Z', message: { model: 'claude-sonnet', content: [] } }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'claude_code', sessionFile });

    expect(metrics?.session_id).toBe('claude-mode-session');
    expect(metrics?.agent_modes).toEqual(['normal']);
    expect(metrics?.agent_turns).toBe(1);
  });
});
