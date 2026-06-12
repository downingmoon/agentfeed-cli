import { describe, expect, it } from 'vitest';
import { discardCompletePayload, discardConfirmationPayload, renderDiscardCompleteHumanLines, renderDiscardConfirmationHumanLines } from '../src/cli/discard-command.js';


const plainStyle = {
  heading: (text: string) => text,
  section: (text: string) => text,
  command: (text: string) => text
} as const;

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


  it('renders human confirmation without marking files removed', () => {
    // Given / When: discard is requested without explicit confirmation.
    const lines = renderDiscardConfirmationHumanLines({ draftId: 'draft_keep', hadJson: true, hadMarkdown: false }, plainStyle);

    // Then: human output explains that nothing was deleted and shows review/delete commands.
    expect(lines).toEqual([
      'AgentFeed discard paused',
      'Discard confirmation required.',
      'No local draft files were deleted.',
      '',
      'Summary',
      'Draft: draft_keep',
      'JSON: will be removed',
      'Markdown: not found',
      '',
      'Next',
      'Delete this local draft after reviewing it:',
      '  agentfeed discard --id draft_keep --yes',
      'Or preview it first:',
      '  agentfeed preview --id draft_keep'
    ]);
  });

  it('renders human completion after confirmed deletion', () => {
    // Given / When: discard has removed the files that existed.
    const lines = renderDiscardCompleteHumanLines({ draftId: 'draft_delete', hadJson: true, hadMarkdown: true }, plainStyle);

    // Then: human output records deletion and post-discard navigation.
    expect(lines).toEqual([
      'AgentFeed draft discarded',
      'Discarded draft: draft_delete',
      '',
      'Summary',
      'Draft: draft_delete',
      'JSON: removed',
      'Markdown: removed',
      '',
      'Next',
      'Recommended order:',
      '  1. agentfeed drafts',
      '  2. agentfeed collect --explain'
    ]);
  });

});
