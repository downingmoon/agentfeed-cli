import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';

let dir: string;
const oldHome = process.env.HOME;

async function writeJsonl(path: string, rows: readonly unknown[]): Promise<void> {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-antigravity-full-transcript-'));
  process.env.HOME = join(dir, 'home');
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  await rm(dir, { recursive: true, force: true });
});

describe('Antigravity full transcript discovery', () => {
  it('prefers transcript_full when history maps both Antigravity transcripts to the project', async () => {
    const conversationId = 'agy-full-transcript';
    const logsDir = join(process.env.HOME ?? '', '.gemini', 'antigravity-cli', 'brain', conversationId, '.system_generated', 'logs');
    const history = join(process.env.HOME ?? '', '.gemini', 'antigravity-cli', 'history.jsonl');
    await mkdir(logsDir, { recursive: true });
    await mkdir(join(history, '..'), { recursive: true });
    await writeJsonl(history, [
      { timestamp: '2026-06-25T03:56:14Z', workspace: dir, conversationId }
    ]);
    await writeJsonl(join(logsDir, 'transcript.jsonl'), [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: 'Update the API file' }
    ]);
    await writeJsonl(join(logsDir, 'transcript_full.jsonl'), [
      { step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: 'Update the API file' },
      { step_index: 1, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:23Z', content: `Created file file://${join(dir, 'src', 'agy-full.ts')} with requested content.` }
    ]);

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'gemini_cli' });

    expect(metrics?.session_id).toBe(conversationId);
    expect(metrics?.changed_files.map((file) => file.path)).toEqual(['src/agy-full.ts']);
  });
});
