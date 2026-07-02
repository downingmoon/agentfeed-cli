import { describe, expect, it } from 'vitest';
import type { LocalDraft } from '../src/types.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { openReviewDraft } from '../src/cli/open-execution.js';

function uploadedDraft(overrides: {
  readonly reviewUrl?: string | null;
  readonly apiBaseUrl?: string | null;
  readonly reviewBaseUrl?: string | null;
} = {}): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-open-execution', source: 'codex' });
  draft.id = 'draft_open_execution';
  draft.upload = {
    uploaded: true,
    worklog_id: 'worklog_open_execution',
    review_url: overrides.reviewUrl ?? 'https://agentfeed.downingmoon.dev/worklogs/worklog_open_execution/review',
    uploaded_at: '2026-06-12T00:00:00.000Z',
    api_base_url: overrides.apiBaseUrl ?? null,
    review_base_url: overrides.reviewBaseUrl ?? null
  };
  return draft;
}

async function defaultCredentialResolution() {
  return {
    credentials: null,
    token_source: 'missing',
    credentials_file_path: '/tmp/agentfeed-open-execution/credentials.json',
    credentials_file_exists: false,
    credential_store: 'missing',
    api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
    api_base_url_source: 'default',
    warnings: []
  } as const;
}

describe('open review execution', () => {
  it('opens a trusted default review URL', async () => {
    const openedUrls: string[] = [];

    const result = await openReviewDraft({
      cwd: '/tmp/agentfeed-open-execution',
      draft: uploadedDraft(),
      dependencies: {
        loadCredentialsWithMetadata: defaultCredentialResolution,
        openBrowser: async (reviewUrl) => {
          openedUrls.push(reviewUrl);
          return true;
        }
      }
    });

    expect(openedUrls).toEqual(['https://agentfeed.downingmoon.dev/worklogs/worklog_open_execution/review']);
    expect(result).toEqual({
      draftId: 'draft_open_execution',
      reviewUrl: 'https://agentfeed.downingmoon.dev/worklogs/worklog_open_execution/review',
      opened: true,
      warnings: [],
      jsonWarnings: []
    });
  });

  it('keeps invalid saved API URL warnings while allowing the default review URL', async () => {
    const result = await openReviewDraft({
      cwd: '/tmp/agentfeed-open-execution',
      draft: uploadedDraft(),
      dependencies: {
        loadCredentialsWithMetadata: async () => {
          throw new Error('Invalid AgentFeed API base URL: http is allowed only for localhost.');
        },
        openBrowser: async () => true
      }
    });

    expect(result.warnings).toEqual([
      'ignored invalid AgentFeed API URL while opening a saved review URL: Invalid AgentFeed API base URL: http is allowed only for localhost.'
    ]);
    expect(result.jsonWarnings).toEqual(result.warnings);
  });

  it('keeps browser fallback warnings out of human warning lines but includes them in JSON', async () => {
    const result = await openReviewDraft({
      cwd: '/tmp/agentfeed-open-execution',
      draft: uploadedDraft(),
      dependencies: {
        loadCredentialsWithMetadata: defaultCredentialResolution,
        openBrowser: async () => false
      }
    });

    expect(result.opened).toBe(false);
    expect(result.warnings).toEqual([]);
    expect(result.jsonWarnings).toEqual(['Review URL could not be opened automatically. Open review_url manually.']);
  });

  it('rejects untrusted saved review URLs before opening the browser', async () => {
    let opened = false;

    await expect(openReviewDraft({
      cwd: '/tmp/agentfeed-open-execution',
      draft: uploadedDraft({ reviewUrl: 'https://evil.example/worklogs/worklog_open_execution/review' }),
      dependencies: {
        loadCredentialsWithMetadata: defaultCredentialResolution,
        openBrowser: async () => {
          opened = true;
          return true;
        }
      }
    })).rejects.toThrow('Saved draft review URL is invalid. Run agentfeed share again to upload a fresh private review draft.');

    expect(opened).toBe(false);
  });
});
