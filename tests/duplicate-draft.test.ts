import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { initProject } from '../src/config/project-config.js';
import { collectDraft, collectDraftWithStatus } from '../src/draft/create.js';
import { listDrafts } from '../src/draft/read.js';

let dir: string;

async function writeJsonl(path: string, rows: unknown[]) {
  await writeFile(path, rows.map((row) => JSON.stringify(row)).join('\n') + '\n');
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-duplicate-'));
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

describe('duplicate draft guard and draft note', () => {
  it('reuses an existing draft for the same session, git head, and collection window', async () => {
    const sessionFile = join(dir, 'codex-duplicate.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-session', cwd: dir } },
      { timestamp: '2026-05-20T01:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
        [join(dir, 'src', 'dup.ts')]: { type: 'add', content: 'export const dup = true;\\n' }
      } } }
    ]);

    const first = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(second.id).toBe(first.id);
    expect(second.source.collection_fingerprint).toBe(first.source.collection_fingerprint);
    expect(await listDrafts(dir)).toHaveLength(1);
  });

  it('reports when collection reused an existing matching draft', async () => {
    const sessionFile = join(dir, 'codex-duplicate-status.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-status-session', cwd: dir } }
    ]);

    const first = await collectDraftWithStatus({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraftWithStatus({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(true);
    expect(second.draft.id).toBe(first.draft.id);
  });

  it('redacts secrets in share notes before storing draft summaries', async () => {
    const sessionFile = join(dir, 'codex-note.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'note-session', cwd: dir } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, note: 'token sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890' });

    expect(draft.worklog.summary).toContain('Note: token [REDACTED_SECRET]');
    expect(draft.privacy_scan.status).toBe('danger');
  });

  it('allows duplicate collection when force is set', async () => {
    const sessionFile = join(dir, 'codex-force.jsonl');
    await writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'force-session', cwd: dir } }
    ]);

    const first = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z', force: true });

    expect(second.id).not.toBe(first.id);
    expect(await listDrafts(dir)).toHaveLength(2);
  });
});
