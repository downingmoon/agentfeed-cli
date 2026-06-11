import { describe, expect, it } from 'vitest';
import { discardCompletePayload, discardConfirmationPayload } from '../src/cli/discard-command.js';

describe('discard command payloads', () => {
  it('returns confirmation payload without marking files removed', () => {
    // Given / When: discard is requested without explicit confirmation.
    const payload = discardConfirmationPayload({ draftId: 'draft_keep', hadJson: true, hadMarkdown: false });

    // Then: JSON output tells the caller what would be deleted and how to confirm.
    expect(payload).toEqual({
      confirmation_required: true,
      deleted: false,
      draft_id: 'draft_keep',
      files: {
        json: { existed: true, will_remove: true, removed: false },
        markdown: { existed: false, will_remove: false, removed: false }
      },
      next_actions: ['agentfeed discard --id draft_keep --yes', 'agentfeed preview --id draft_keep']
    });
  });

  it('returns completed payload after confirmed deletion', () => {
    // Given / When: discard has removed the files that existed.
    const payload = discardCompletePayload({ draftId: 'draft_delete', hadJson: true, hadMarkdown: true });

    // Then: JSON output records completed deletion and post-discard navigation.
    expect(payload).toEqual({
      confirmation_required: false,
      deleted: true,
      draft_id: 'draft_delete',
      files: {
        json: { existed: true, removed: true },
        markdown: { existed: true, removed: true }
      },
      next_actions: ['agentfeed drafts', 'agentfeed collect --explain']
    });
  });
});
