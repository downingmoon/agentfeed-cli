import { describe, expect, it } from 'vitest';
import {
  commandCatalogNextActions,
  initNextActions,
  privacyScanNextActions
} from '../src/cli/guidance-actions.js';

describe('CLI guidance next actions', () => {
  it('returns privacy scan follow-up actions by target and mode', () => {
    expect(privacyScanNextActions({ draftId: 'draft_scan', dryRun: true })).toEqual([
      'agentfeed scan --id draft_scan'
    ]);
    expect(privacyScanNextActions({ draftId: 'draft_scan' })).toEqual([
      'agentfeed preview --id draft_scan',
      'agentfeed publish --id draft_scan --yes'
    ]);
    expect(privacyScanNextActions({ path: 'README.md' })).toEqual(['agentfeed collect --explain']);
    expect(privacyScanNextActions()).toEqual(['agentfeed status']);
  });

  it('returns initialization follow-up actions by initialization state', () => {
    expect(initNextActions(false)).toEqual([
      'agentfeed login',
      'agentfeed share --dry',
      'agentfeed status'
    ]);
    expect(initNextActions(true)).toEqual([
      'agentfeed status',
      'agentfeed share --dry',
      'agentfeed init --force'
    ]);
  });

  it('returns command catalog onboarding actions', () => {
    expect(commandCatalogNextActions()).toEqual([
      'agentfeed init',
      'agentfeed login',
      'agentfeed share --dry'
    ]);
  });
});
