import { describe, expect, it } from 'vitest';
import { collectJsonNextActions, previewNextActions, remotePreviewNextActions } from '../src/cli/draft-next-actions.js';
import type { LocalDraft } from '../src/types.js';

function draftWithUpload(id: string, uploaded: boolean): LocalDraft {
  return {
    id,
    generated_at: '2026-06-11T00:00:00.000Z',
    project: { name: 'agentfeed-cli', path: '/tmp/agentfeed-cli' },
    git: { branch: 'main', commit: 'abc123', dirty: false, changed_files: [] },
    agents: [],
    summary: { title: 'Draft title', body: 'Draft body', bullets: [] },
    metrics: { files_changed: 0, insertions: 0, deletions: 0, commands: [] },
    privacy: { redactions: [], warnings: [] },
    upload: { uploaded, status: uploaded ? 'uploaded' : 'pending', review_url: uploaded ? 'https://example.test/review' : null }
  };
}

describe('draft next actions', () => {
  it('returns local preview actions for pending and uploaded drafts', () => {
    const pending = draftWithUpload('draft_pending', false);
    const uploaded = draftWithUpload('draft_uploaded', true);

    expect(previewNextActions(pending)).toEqual([
      'agentfeed publish --id draft_pending --yes',
      'agentfeed scan --id draft_pending'
    ]);
    expect(previewNextActions(uploaded)).toEqual([
      'agentfeed open --id draft_uploaded',
      'agentfeed scan --id draft_uploaded'
    ]);
  });

  it('returns collect JSON actions based on upload state', () => {
    const pending = draftWithUpload('draft_pending', false);
    const uploaded = draftWithUpload('draft_uploaded', true);

    expect(collectJsonNextActions(pending)).toEqual([
      'agentfeed preview --id draft_pending',
      'agentfeed publish --id draft_pending --yes'
    ]);
    expect(collectJsonNextActions(uploaded)).toEqual([
      'agentfeed open --id draft_uploaded',
      'agentfeed preview --id draft_uploaded'
    ]);
  });

  it('returns remote preview actions based on remote validity', () => {
    expect(remotePreviewNextActions('draft_remote', true)).toEqual([
      'agentfeed publish --id draft_remote --yes',
      'agentfeed scan --id draft_remote'
    ]);
    expect(remotePreviewNextActions('draft_remote', false)).toEqual([
      'agentfeed scan --id draft_remote',
      'agentfeed preview --id draft_remote --remote'
    ]);
  });
});
