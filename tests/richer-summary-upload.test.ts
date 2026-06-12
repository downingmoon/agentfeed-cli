import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { draftToIngestRequest } from '../src/api/client.js';
import { initProject } from '../src/config/project-config.js';
import { collectDraft } from '../src/draft/create.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-richer-upload-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  await initProject({ cwd: dir, noGitCheck: false });
  execFileSync('git', ['add', '.agentfeed/config.json', '.agentfeed/redaction-rules.json'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'agentfeed config'], { cwd: dir, stdio: 'ignore' });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('richer summary upload boundary', () => {
  it('uploads richer public fields without raw transcript or raw diff content', async () => {
    // Given: a Codex session contains raw transcript text, a raw diff, a file path, and a secret-like source value.
    const sessionFile = join(dir, '.codex', 'sessions', 'richer-summary.jsonl');
    await mkdir(join(dir, '.codex', 'sessions'), { recursive: true });
    await writeJsonl(sessionFile, [
      { timestamp: '2026-06-13T00:00:00Z', type: 'session_meta', payload: { id: 'richer-upload-session', cwd: dir, model: 'gpt-richer' } },
      { timestamp: '2026-06-13T00:00:01Z', type: 'response_item', payload: { type: 'message', role: 'user', content: 'RAW_TRANSCRIPT_SECRET_SHOULD_STAY_LOCAL' } },
      { timestamp: '2026-06-13T00:00:02Z', type: 'response_item', payload: { type: 'function_call', name: 'exec_command', arguments: JSON.stringify({ cmd: 'npm test', workdir: dir }), call_id: 'test-ok' } },
      { timestamp: '2026-06-13T00:00:03Z', type: 'response_item', payload: { type: 'function_call_output', call_id: 'test-ok', output: 'Process exited with code 0\n8 passed' } },
      { timestamp: '2026-06-13T00:00:04Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const token = "sk_live_raw_diff_secret_123456789";\n' },
      } } },
    ]);

    // When: the draft is collected and converted to the upload payload.
    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile });
    const payload = draftToIngestRequest(draft);
    const serialized = JSON.stringify(payload);

    // Then: the public payload has richer fields but no raw local evidence.
    expect(payload.worklog.summary).toContain('public-safe labels, metrics, outcomes, and timeline entries');
    expect(payload.worklog.outcome.some((item) => item.includes('passing tests as verification evidence'))).toBe(true);
    expect(payload.worklog.timeline.map((item) => item.title)).toContain('Generated richer public summary');
    expect(serialized).not.toContain('RAW_TRANSCRIPT_SECRET_SHOULD_STAY_LOCAL');
    expect(serialized).not.toContain('sk_live_raw_diff_secret_123456789');
    expect(serialized).not.toContain('src/api.ts');
    expect(serialized).not.toContain('--- a/');
    expect(serialized).not.toContain('@@');
  });
});
