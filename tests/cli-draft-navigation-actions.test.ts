import { describe, expect, it } from 'vitest';
import {
  discardCompleteNextActions,
  discardConfirmationNextActions,
  draftListNextActions,
  openNextActions,
  shareDryRunNextActions
} from '../src/cli/draft-navigation-actions.js';

describe('draft navigation next actions', () => {
  it('returns share dry-run actions with login only when credentials are missing', () => {
    expect(shareDryRunNextActions('draft_share', false)).toEqual([
      'agentfeed preview --id draft_share',
      'agentfeed login',
      'agentfeed publish --id draft_share --yes'
    ]);
    expect(shareDryRunNextActions('draft_share', true)).toEqual([
      'agentfeed preview --id draft_share',
      'agentfeed publish --id draft_share --yes'
    ]);
  });

  it('returns draft list actions from the latest valid draft state', () => {
    expect(draftListNextActions([])).toEqual(['agentfeed collect --explain', 'agentfeed share --dry']);
    expect(draftListNextActions([{ id: 'draft_bad', valid: false }])).toEqual(['agentfeed collect --explain']);
    expect(draftListNextActions([
      { id: 'draft_bad', valid: false },
      { id: 'draft_pending', valid: true, status: 'pending' }
    ])).toEqual([
      'agentfeed preview --id draft_pending',
      'agentfeed publish --id draft_pending --yes'
    ]);
    expect(draftListNextActions([{ id: 'draft_uploaded', valid: true, status: 'uploaded' }])).toEqual([
      'agentfeed preview --id draft_uploaded',
      'agentfeed open --id draft_uploaded'
    ]);
  });

  it('returns discard and open follow-up actions', () => {
    expect(discardConfirmationNextActions('draft_delete')).toEqual([
      'agentfeed discard --id draft_delete --yes',
      'agentfeed preview --id draft_delete'
    ]);
    expect(discardCompleteNextActions()).toEqual(['agentfeed drafts', 'agentfeed collect --explain']);
    expect(openNextActions('draft_open')).toEqual(['agentfeed preview --id draft_open', 'agentfeed status']);
  });
});
