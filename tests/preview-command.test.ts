import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { localPreviewJsonPayload, remotePreviewJsonPayload, renderLocalPreviewHumanLines, renderRemotePreviewHumanLines } from '../src/cli/preview-command.js';

describe('preview command payload', () => {
  it('builds local preview JSON output with pending next actions', () => {
    // Given: a pending local draft preview.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-preview', source: 'codex' });
    draft.id = 'draft_pending';

    // When: the CLI builds the machine-readable local preview payload.
    const payload = localPreviewJsonPayload(draft);

    // Then: the draft fields are preserved and action guidance is attached.
    expect(payload.id).toBe('draft_pending');
    expect(payload.project.name).toBe('proj');
    expect(payload.next_actions).toEqual([
      'agentfeed publish --id draft_pending --yes',
      'agentfeed scan --id draft_pending'
    ]);
  });

  it('builds remote preview JSON output based on remote validity', () => {
    // Given: a valid remote preview response from the API contract parser.
    const remote = {
      valid: true,
      preview: {
        title: 'Remote preview',
        summary: 'Remote summary',
        user_note: null,
        model: 'gpt-5.5',
        metrics_row: '1 file'
      },
      warnings: ['check privacy wording']
    };

    // When: the CLI builds the machine-readable remote preview payload.
    const payload = remotePreviewJsonPayload({ draftId: 'draft_remote', remote });

    // Then: the remote contract fields are preserved and publish-first guidance is attached.
    expect(payload).toEqual({
      draft_id: 'draft_remote',
      valid: true,
      preview: {
        title: 'Remote preview',
        summary: 'Remote summary',
        user_note: null,
        model: 'gpt-5.5',
        metrics_row: '1 file'
      },
      warnings: ['check privacy wording'],
      next_actions: [
        'agentfeed publish --id draft_remote --yes',
        'agentfeed scan --id draft_remote'
      ]
    });
  });

  it('renders local preview human output lines with review URL and next actions', () => {
    // Given: an uploaded local draft with a trusted review URL.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-preview', source: 'codex' });
    draft.id = 'draft_uploaded';
    draft.worklog.title = 'Uploaded preview';
    draft.worklog.summary = 'Uploaded preview summary.';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_uploaded',
      review_url: 'https://agentfeed.dev/worklogs/worklog_uploaded/review'
    };

    // When: the CLI builds human-readable local preview output.
    const lines = renderLocalPreviewHumanLines(draft, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    });

    // Then: the sectioned output preserves the existing preview contract.
    expect(lines).toEqual([
      'AgentFeed preview',
      '',
      '@local · codex · proj',
      '',
      'Summary',
      'ID: draft_uploaded',
      'Title: Uploaded preview',
      'Summary: Uploaded preview summary.',
      '',
      'Details',
      'Metrics: 0 files · +0 -0',
      'Privacy: safe · findings 0',
      'Upload: uploaded',
      'Review URL:',
      '  https://agentfeed.dev/worklogs/worklog_uploaded/review',
      '',
      'Next',
      'Recommended order:',
      '  1. agentfeed open --id draft_uploaded',
      '  2. agentfeed scan --id draft_uploaded'
    ]);
  });

  it('renders remote preview human output lines with validity guidance', () => {
    // Given: an invalid remote preview response.
    const remote = {
      valid: false,
      preview: {
        title: 'Remote invalid',
        summary: 'Remote summary',
        user_note: null,
        model: null,
        metrics_row: '0 files'
      },
      warnings: ['summary is too short']
    };

    // When: the CLI builds human-readable remote preview output.
    const lines = renderRemotePreviewHumanLines({ draftId: 'draft_remote', draftTitle: 'Local title', remote }, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    });

    // Then: remote validity, warning text, title, and retry guidance are preserved.
    expect(lines).toEqual([
      'AgentFeed remote preview',
      '',
      'Summary',
      'Remote preview: invalid',
      'Warnings: summary is too short',
      'Title: Remote invalid',
      '',
      'Next',
      'Recommended order:',
      '  1. agentfeed scan --id draft_remote',
      '  2. agentfeed preview --id draft_remote --remote'
    ]);
  });

});
