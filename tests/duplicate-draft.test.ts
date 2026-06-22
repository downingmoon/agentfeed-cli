import { describe, expect, it } from 'vitest';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { collectDraft, collectDraftWithStatus } from '../src/draft/create.js';
import { listDrafts } from '../src/draft/read.js';
import { useDuplicateDraftFixture } from './duplicate-draft-helpers.js';

const fixture = useDuplicateDraftFixture();

describe('duplicate draft guard', () => {
  it('reuses an existing draft for the same session, git head, and collection window', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-duplicate.jsonl');
    await fixture.writeJsonl(sessionFile, [
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
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-duplicate-status.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-status-session', cwd: dir } }
    ]);

    const first = await collectDraftWithStatus({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraftWithStatus({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(true);
    expect(second.draft.id).toBe(first.draft.id);
  });

  it('reuses git-only drafts when no agent session evidence is available', async () => {
    const dir = fixture.dir();
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = false;\nexport const changed = true;\n');

    const first = await collectDraftWithStatus({ cwd: dir, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraftWithStatus({ cwd: dir, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(true);
    expect(second.draft.id).toBe(first.draft.id);
    expect(second.draft.source.collection_fingerprint).toBe(first.draft.source.collection_fingerprint);
    expect(second.draft.source.collection_fingerprint).toBeTruthy();
    expect(await listDrafts(dir)).toHaveLength(1);
  });

  it('allows duplicate collection when force is set', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-force.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'force-session', cwd: dir } }
    ]);

    const first = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z' });
    const second = await collectDraft({ cwd: dir, source: 'codex', sessionFile, since: '2026-05-20T01:00:00Z', until: '2026-05-20T02:00:00Z', force: true });

    expect(second.id).not.toBe(first.id);
    expect(await listDrafts(dir)).toHaveLength(2);
  });
});
