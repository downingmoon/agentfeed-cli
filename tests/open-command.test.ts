import { describe, expect, it } from 'vitest';
import { openJsonPayload } from '../src/cli/open-command.js';

describe('open command payload', () => {
  it('builds machine-readable review URL output with next actions', () => {
    expect(openJsonPayload({
      draftId: 'draft_open',
      reviewUrl: 'https://agentfeed.dev/worklogs/worklog_open/review',
      opened: true,
      warnings: ['ignored invalid AgentFeed API URL while opening a saved review URL: invalid URL']
    })).toEqual({
      draft_id: 'draft_open',
      review_url: 'https://agentfeed.dev/worklogs/worklog_open/review',
      opened: true,
      warnings: ['ignored invalid AgentFeed API URL while opening a saved review URL: invalid URL'],
      next_actions: ['agentfeed preview --id draft_open', 'agentfeed status']
    });
  });

  it('preserves manual-open fallback status in the JSON payload', () => {
    expect(openJsonPayload({
      draftId: 'draft_manual',
      reviewUrl: 'https://agentfeed.dev/worklogs/worklog_manual/review',
      opened: false,
      warnings: ['Review URL could not be opened automatically. Open review_url manually.']
    })).toEqual({
      draft_id: 'draft_manual',
      review_url: 'https://agentfeed.dev/worklogs/worklog_manual/review',
      opened: false,
      warnings: ['Review URL could not be opened automatically. Open review_url manually.'],
      next_actions: ['agentfeed preview --id draft_manual', 'agentfeed status']
    });
  });
});
