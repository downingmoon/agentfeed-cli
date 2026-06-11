import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { localPreviewJsonPayload, remotePreviewJsonPayload } from '../src/cli/preview-command.js';

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
});
