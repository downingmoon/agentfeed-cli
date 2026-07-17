import { describe, expect, it } from 'vitest';
import type { PublishDraftResult } from '../src/api/client.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { ReviewUrlHandoff } from '../src/types.js';
import { renderUploadConfirmationRequiredLines, renderUploadResultLines } from '../src/cli/upload-output.js';

const uploadResult: PublishDraftResult = {
  id: 'worklog_upload',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_upload/review',
  created_at: '2026-06-12T03:00:00.000Z'
};

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

describe('upload output helpers', () => {
  it('renders upload result summary with policy and next actions', () => {
    // Given: a successful private review upload with policy notes.
    const lines = renderUploadResultLines({
      heading: 'AgentFeed upload complete',
      message: 'Private review draft uploaded.',
      draftId: 'draft_upload',
      result: uploadResult,
      handoff: noHandoff,
      privacyPolicyLines: ['Private review upload only.', 'Public publishing remains blocked.']
    });

    // Then: the human report keeps policy, summary, URL, and next actions together.
    expect(lines.join('\n')).toContain('AgentFeed upload complete');
    expect(lines.join('\n')).toContain('Private review draft uploaded.');
    expect(lines.join('\n')).toContain('Policy');
    expect(lines.join('\n')).toContain('Private review upload only.');
    expect(lines.join('\n')).toContain('Summary');
    expect(lines.join('\n')).toContain('Draft: draft_upload');
    expect(lines.join('\n')).toContain('Status: needs_review');
    expect(lines.join('\n')).toContain('Review URL:');
    expect(lines.join('\n')).toContain('https://agentfeed.downingmoon.dev/worklogs/worklog_upload/review');
    expect(lines.join('\n')).toContain('Recommended order:');
    expect(lines.join('\n')).toContain('1. agentfeed open --id draft_upload');
    expect(lines.join('\n')).toContain('2. agentfeed preview --id draft_upload');
  });

  it('renders upload confirmation with cache reuse warning and optional extra command', () => {
    // Given: a draft that cannot reuse a stale private review cache.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/proj', source: 'codex' });
    draft.id = 'draft_confirm';
    draft.worklog.title = 'Confirm upload';

    // When: confirmation lines are rendered.
    const lines = renderUploadConfirmationRequiredLines(
      draft,
      'agentfeed publish --id draft_confirm --yes',
      'agentfeed share --yes',
      { cacheReuseReason: 'credential_binding_mismatch' }
    );

    // Then: the report explains no upload happened and gives the safe next commands.
    expect(lines.join('\n')).toContain('AgentFeed upload paused');
    expect(lines.join('\n')).toContain('Upload confirmation required.');
    expect(lines.join('\n')).toContain('No data was uploaded to AgentFeed.');
    expect(lines.join('\n')).toContain('Saved private review cache cannot be reused: saved upload was created with a different token or user binding.');
    expect(lines.join('\n')).toContain('Draft: draft_confirm');
    expect(lines.join('\n')).toContain('Project: proj');
    expect(lines.join('\n')).toContain('Title: Confirm upload');
    expect(lines.join('\n')).toContain('Preview: agentfeed preview --id draft_confirm');
    expect(lines.join('\n')).toContain('Safety: upload happens only after you answer yes or rerun with --yes.');
    expect(lines.join('\n')).toContain('agentfeed publish --id draft_confirm --yes');
    expect(lines.join('\n')).toContain('agentfeed share --yes');
  });
});
