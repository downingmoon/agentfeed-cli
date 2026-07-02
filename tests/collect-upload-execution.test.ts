import { describe, expect, it } from 'vitest';
import type { ApiMetadata, PublishDraftResult } from '../src/api/client.js';
import { runCollectJsonUploadCommand } from '../src/cli/collect-upload-execution.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../src/types.js';

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
  ingestion_token: 'af_live_collect_upload_execution',
  created_at: '2026-06-21T00:00:00.000Z'
};

const metadata: ApiMetadata = {
  service: 'agentfeed-api',
  api_version: 'v1',
  backend_version: 'test',
  contract_version: '2026-06-21',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  supported_clients: {
    cli: { min_version: '0.2.0', contract_version: '2026-06-21' },
    frontend: { min_version: '0.2.0', contract_version: '2026-06-21' }
  }
};

const upload: PublishDraftResult = {
  id: 'worklog_collect_upload_execution',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_collect_upload_execution/review',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  created_at: '2026-06-21T01:00:00.000Z'
};

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-collect-upload-execution', source: 'codex' });
  draft.id = id;
  draft.source.created_at = '2026-06-21T01:30:00.000Z';
  draft.source.collection_window = { since: '2026-06-21T00:00:00.000Z', until: '2026-06-21T01:00:00.000Z' };
  draft.worklog.title = 'Collect upload execution contract';
  return draft;
}

describe('collect JSON upload execution', () => {
  it('preflights with retry guidance and returns the saved uploaded draft', async () => {
    // Given: collect has produced a JSON draft and upload credentials are present.
    const draft = draftWithId('draft_collect_upload_execution');
    const savedDraft = draftWithId('draft_collect_upload_execution');
    const preflightCalls: unknown[][] = [];
    const publishReviewBaseUrls: Array<string | null | undefined> = [];
    const sanitizedDraftIds: string[] = [];

    // When: JSON collect upload execution runs.
    const result = await runCollectJsonUploadCommand({
      cwd: '/tmp/agentfeed-collect-upload-execution',
      draft,
      credentials,
      openReview: false,
      dependencies: {
        requireUploadPreflight: async (...args) => {
          preflightCalls.push(args);
          return metadata;
        },
        publishDraft: async (options) => {
          publishReviewBaseUrls.push(options.reviewBaseUrl);
          return upload;
        },
        readDraft: async () => savedDraft,
        sanitizeDraftForOutput: async (_cwd, nextDraft) => {
          sanitizedDraftIds.push(nextDraft.id);
          return nextDraft;
        },
        handoffReviewUrl: async () => noHandoff
      }
    });

    // Then: upload uses the contract retry command and refreshes output from persisted draft state.
    expect(result).toBe(savedDraft);
    expect(preflightCalls).toEqual([[credentials, { retryCommand: 'agentfeed collect --json --upload' }]]);
    expect(publishReviewBaseUrls).toEqual(['https://agentfeed.downingmoon.dev']);
    expect(sanitizedDraftIds).toEqual(['draft_collect_upload_execution']);
    expect(result.upload.handoff).toBeUndefined();
  });

  it('attaches open-review handoff with API and metadata review bases', async () => {
    // Given: collect JSON upload is explicitly asked to open the review page.
    const draft = draftWithId('draft_collect_upload_handoff_execution');
    const savedDraft = draftWithId('draft_collect_upload_handoff_execution');
    const handoffCalls: Array<{ readonly copy: boolean; readonly open: boolean; readonly apiBaseUrl: string; readonly reviewBaseUrl: string | null | undefined }> = [];

    // When: upload completes and review handoff is requested.
    const result = await runCollectJsonUploadCommand({
      cwd: '/tmp/agentfeed-collect-upload-execution',
      draft,
      credentials,
      openReview: true,
      dependencies: {
        requireUploadPreflight: async () => metadata,
        publishDraft: async () => upload,
        readDraft: async () => savedDraft,
        sanitizeDraftForOutput: async (_cwd, nextDraft) => nextDraft,
        handoffReviewUrl: async (_reviewUrl, options) => {
          handoffCalls.push({
            copy: options.copy,
            open: options.open,
            apiBaseUrl: options.apiBaseUrl,
            reviewBaseUrl: options.reviewBaseUrl
          });
          return noHandoff;
        }
      }
    });

    // Then: the saved draft carries the same handoff policy the CLI previously performed inline.
    expect(result.upload.handoff).toEqual(noHandoff);
    expect(handoffCalls).toEqual([{ copy: false, open: true, apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1', reviewBaseUrl: 'https://agentfeed.downingmoon.dev' }]);
  });
});
