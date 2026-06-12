import { describe, expect, it } from 'vitest';
import type { PublishDraftResult } from '../src/api/client.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { ReviewUrlHandoff } from '../src/types.js';
import { renderShareLocalNextLines, shareLocalJsonPayload, shareUploadedJsonPayload } from '../src/cli/share-output.js';

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

const uploadResult: PublishDraftResult = {
  id: 'worklog_share_output',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.dev/worklogs/worklog_share_output/review',
  created_at: '2026-06-12T05:00:00.000Z'
};

function draftWithId(id: string) {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/proj', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Share output contract';
  draft.worklog.summary = 'Lock share output contract.';
  return draft;
}

describe('share output helpers', () => {
  it('builds dry-run JSON payload with privacy policy, next actions, and optional collection explain', () => {
    // Given: a local draft from share dry-run with no saved upload side effects.
    const draft = draftWithId('draft_share_dry');

    // When: the JSON payload is assembled for the CLI surface.
    const payload = shareLocalJsonPayload({
      dryRun: true,
      hasCredentials: false,
      reusedExistingDraft: true,
      draft,
      warnings: ['collection warning'],
      explain: true
    });

    // Then: the parseable contract mirrors share --dry --json guidance.
    expect(payload).toMatchObject({
      dry_run: true,
      upload_skipped: null,
      reused_existing_draft: true,
      draft,
      privacy_policy: {
        private_review_upload: 'allowed',
        public_publish_blocked: false,
        review_required: false
      },
      warnings: ['collection warning'],
      next_actions: [
        'agentfeed preview --id draft_share_dry',
        'agentfeed login',
        'agentfeed publish --id draft_share_dry --yes'
      ]
    });
    expect(payload.collection_explain).toContain('Collection quality:');
  });

  it('builds token-missing JSON payload without recommending login when credentials exist elsewhere', () => {
    // Given: share requested upload but could not load a token for this invocation.
    const draft = draftWithId('draft_share_token_missing');

    // When: local JSON guidance is assembled with publish guidance credentials available.
    const payload = shareLocalJsonPayload({
      dryRun: false,
      hasCredentials: true,
      reusedExistingDraft: false,
      draft,
      warnings: [],
      explain: false
    });

    // Then: upload_skipped is explicit and next actions avoid duplicate login guidance.
    expect(payload.upload_skipped).toEqual({ reason: 'token_missing', next_action: 'agentfeed login' });
    expect(payload.next_actions).toEqual([
      'agentfeed preview --id draft_share_token_missing',
      'agentfeed publish --id draft_share_token_missing --yes'
    ]);
    expect(payload.collection_explain).toBeUndefined();
  });

  it('builds uploaded share JSON payload with upload handoff and upload next actions', () => {
    // Given: a share upload completed through the API and returned handoff metadata.
    const draft = draftWithId('draft_share_uploaded');

    // When: the uploaded JSON payload is assembled.
    const payload = shareUploadedJsonPayload({
      reusedExistingDraft: false,
      draft,
      upload: uploadResult,
      handoff: noHandoff,
      warnings: ['remote warning'],
      explain: false
    });

    // Then: share JSON keeps upload and draft identifiers aligned for frontend/backend consumers.
    expect(payload).toEqual({
      dry_run: false,
      reused_existing_draft: false,
      draft_id: 'draft_share_uploaded',
      draft,
      upload: uploadResult,
      privacy_policy: {
        private_review_upload: 'allowed',
        public_publish_blocked: false,
        review_required: false
      },
      handoff: noHandoff,
      warnings: ['remote warning'],
      next_actions: [
        'agentfeed open --id draft_share_uploaded',
        'agentfeed preview --id draft_share_uploaded'
      ]
    });
  });

  it('renders local dry-run and token-missing next lines without upload side effects', () => {
    // Given: share has kept a local draft instead of uploading.
    const dryRunLines = renderShareLocalNextLines({ dryRun: true, draftId: 'draft_share_dry', hasCredentials: false });
    const skippedLines = renderShareLocalNextLines({ dryRun: false, draftId: 'draft_share_skip', hasCredentials: true });

    // Then: human output states the local-only result and safe next actions.
    expect(dryRunLines.join('\n')).toContain('Dry run complete. Local draft kept: draft_share_dry');
    expect(dryRunLines.join('\n')).toContain('1. agentfeed preview --id draft_share_dry');
    expect(dryRunLines.join('\n')).toContain('2. agentfeed login');
    expect(dryRunLines.join('\n')).toContain('3. agentfeed publish --id draft_share_dry --yes');
    expect(skippedLines.join('\n')).toContain('Upload skipped: AgentFeed token is missing. Local draft kept: draft_share_skip');
    expect(skippedLines.join('\n')).not.toContain('agentfeed login');
    expect(skippedLines.join('\n')).toContain('agentfeed publish --id draft_share_skip --yes');
  });
});
