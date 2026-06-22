import { describe, expect, it } from 'vitest';
import { join } from 'node:path';
import { collectDraft, collectDraftWithStatus } from '../src/draft/create.js';
import { listDrafts } from '../src/draft/read.js';
import { useDuplicateDraftFixture } from './duplicate-draft-helpers.js';

const fixture = useDuplicateDraftFixture();

describe('duplicate draft note handling', () => {
  it('does not reuse a matching draft when the share note changes uploadable output', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-note-reuse.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'dup-note-session', cwd: dir } }
    ]);

    const first = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      note: 'first public note'
    });
    const second = await collectDraftWithStatus({
      cwd: dir,
      source: 'codex',
      sessionFile,
      since: '2026-05-20T01:00:00Z',
      until: '2026-05-20T02:00:00Z',
      note: 'second public note'
    });

    expect(first.reusedExisting).toBe(false);
    expect(second.reusedExisting).toBe(false);
    expect(second.draft.id).not.toBe(first.draft.id);
    expect(first.draft.worklog.user_note).toBe('first public note');
    expect(second.draft.worklog.user_note).toBe('second public note');
    expect(first.draft.source.collection_fingerprint).not.toBe(second.draft.source.collection_fingerprint);
    expect(await listDrafts(dir)).toHaveLength(2);
  });

  it('redacts secrets in share notes and stores them separately from generated summaries', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'codex-note.jsonl');
    await fixture.writeJsonl(sessionFile, [
      { timestamp: '2026-05-20T01:00:00Z', type: 'session_meta', payload: { id: 'note-session', cwd: dir } }
    ]);

    const draft = await collectDraft({ cwd: dir, source: 'codex', sessionFile, note: 'token sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890' });

    expect(draft.worklog.user_note).toBe('token [REDACTED_SECRET]');
    expect(draft.worklog.summary).not.toContain('Note:');
    expect(draft.privacy_scan.status).toBe('danger');
  });
});
