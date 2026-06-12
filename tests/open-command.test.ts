import { describe, expect, it } from 'vitest';
import { noOpenableDraftsMessage, noUploadedDraftsMessage, notUploadedDraftMessage, openJsonPayload, renderOpenHumanLines } from '../src/cli/open-command.js';


const plainStyle = {
  heading: (text: string) => text,
  section: (text: string) => text,
  command: (text: string) => text,
  warn: (text: string) => text
} as const;

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


  it('renders human output when the review URL opens successfully', () => {
    expect(renderOpenHumanLines({
      draftId: 'draft_open',
      reviewUrl: 'https://agentfeed.dev/worklogs/worklog_open/review',
      opened: true,
      warnings: ['ignored invalid AgentFeed API URL while opening a saved review URL: invalid URL']
    }, plainStyle)).toEqual([
      'AgentFeed review opened',
      'Opened review URL.',
      '',
      'Summary',
      'Draft: draft_open',
      'Review URL:',
      '  https://agentfeed.dev/worklogs/worklog_open/review',
      '',
      'Warnings',
      'Warning: ignored invalid AgentFeed API URL while opening a saved review URL: invalid URL',
      '',
      'Next',
      'Recommended order:',
      '  1. agentfeed preview --id draft_open',
      '  2. agentfeed status'
    ]);
  });

  it('renders human output with a manual-open fallback when the browser launch fails', () => {
    expect(renderOpenHumanLines({
      draftId: 'draft_manual',
      reviewUrl: 'https://agentfeed.dev/worklogs/worklog_manual/review',
      opened: false,
      warnings: []
    }, plainStyle)).toEqual([
      'AgentFeed review URL',
      'Browser open failed. Open this URL manually:',
      '',
      'Summary',
      'Draft: draft_manual',
      'Review URL:',
      '  https://agentfeed.dev/worklogs/worklog_manual/review',
      '',
      'Next',
      'Recommended order:',
      '  1. agentfeed preview --id draft_manual',
      '  2. agentfeed status'
    ]);
  });



  it('renders pending draft guidance when a draft has no review URL', () => {
    expect(notUploadedDraftMessage('draft_pending')).toBe([
      'Draft has not been uploaded yet: draft_pending',
      'Run: agentfeed publish --id draft_pending --yes',
      'Run: agentfeed preview --id draft_pending',
      'Run: agentfeed drafts'
    ].join('\n'));
  });

  it('renders latest pending draft guidance when no uploaded drafts exist', () => {
    expect(noUploadedDraftsMessage('draft_latest')).toBe([
      'No uploaded local drafts found.',
      'Newest draft: draft_latest',
      'Run: agentfeed publish --id draft_latest --yes',
      'Run: agentfeed share --yes',
      'Run: agentfeed drafts'
    ].join('\n'));
  });

  it('renders empty uploaded-review guidance when no drafts exist', () => {
    expect(noOpenableDraftsMessage()).toBe([
      'No uploaded review drafts found.',
      '',
      'Create and review a draft first:',
      'Run: agentfeed share --dry',
      'Run: agentfeed publish --latest --yes',
      '',
      'Or inspect saved drafts:',
      'Run: agentfeed drafts'
    ].join('\n'));
  });

});
