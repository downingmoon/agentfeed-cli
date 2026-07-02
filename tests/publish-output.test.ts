import { describe, expect, it } from 'vitest';
import type { PublishDraftResult } from '../src/api/client.js';
import { publishJsonPayload, renderPublishUploadResultLines } from '../src/cli/publish-output.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { ReviewUrlHandoff } from '../src/types.js';

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

const uploadResult: PublishDraftResult = {
  id: 'worklog_publish_output',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_publish_output/review',
  created_at: '2026-06-12T06:00:00.000Z'
};

function draftWithId(id: string) {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/proj', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Publish output contract';
  draft.worklog.summary = 'Lock direct publish JSON contract.';
  return draft;
}

describe('publish output helpers', () => {
  it('builds direct publish JSON payload with privacy policy, handoff, and upload next actions', () => {
    // Given: direct publish uploaded a saved local draft and produced review handoff metadata.
    const draft = draftWithId('draft_publish_output');

    // When: the machine-readable publish payload is assembled for stdout.
    const payload = publishJsonPayload({
      draft,
      upload: uploadResult,
      handoff: noHandoff
    });

    // Then: CLI/frontend/backend consumers receive a stable direct-publish JSON contract.
    expect(payload).toEqual({
      draft_id: 'draft_publish_output',
      upload: uploadResult,
      privacy_policy: {
        private_review_upload: 'allowed',
        public_publish_blocked: false,
        review_required: false
      },
      handoff: noHandoff,
      next_actions: [
        'agentfeed open --id draft_publish_output',
        'agentfeed preview --id draft_publish_output'
      ]
    });
  });

  it('renders direct publish human upload result lines with privacy policy and next actions', () => {
    // Given: direct publish uploaded a saved local draft.
    const draft = draftWithId('draft_publish_human');

    // When: the human-readable publish upload result is rendered.
    const lines = renderPublishUploadResultLines({
      draft,
      upload: uploadResult,
      handoff: noHandoff
    });

    // Then: the direct publish surface keeps upload status, review URL, and next actions together.
    expect(lines.join('\n')).toContain('AgentFeed upload complete');
    expect(lines.join('\n')).toContain('Private review draft uploaded.');
    expect(lines.join('\n')).toContain('Draft: draft_publish_human');
    expect(lines.join('\n')).toContain('Status: needs_review');
    expect(lines.join('\n')).toContain('https://agentfeed.downingmoon.dev/worklogs/worklog_publish_output/review');
    expect(lines.join('\n')).toContain('Recommended order:');
    expect(lines.join('\n')).toContain('1. agentfeed open --id draft_publish_human');
    expect(lines.join('\n')).toContain('2. agentfeed preview --id draft_publish_human');
  });

});
