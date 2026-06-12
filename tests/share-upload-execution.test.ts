import { describe, expect, it } from 'vitest';
import type { ApiMetadata, PublishDraftResult } from '../src/api/client.js';
import { runShareUploadCommand } from '../src/cli/share-upload-execution.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials, CollectionWindow, LocalDraft, ReviewUrlHandoff } from '../src/types.js';

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://api.agentfeed.dev/v1',
  ingestion_token: 'af_live_share_upload_execution',
  created_at: '2026-06-12T00:00:00.000Z'
};

const metadata: ApiMetadata = {
  service: 'agentfeed-api',
  api_version: 'v1',
  backend_version: 'test',
  contract_version: '2026-06-12',
  review_base_url: 'https://agentfeed.dev',
  supported_clients: {
    cli: { min_version: '0.2.0', contract_version: '2026-06-12' },
    frontend: { min_version: '0.2.0', contract_version: '2026-06-12' }
  }
};

const upload: PublishDraftResult = {
  id: 'worklog_share_upload_execution',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.dev/worklogs/worklog_share_upload_execution/review',
  review_base_url: 'https://agentfeed.dev',
  created_at: '2026-06-12T01:00:00.000Z'
};

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-share-upload-execution', source: 'codex' });
  draft.id = id;
  draft.source.created_at = '2026-06-12T01:30:00.000Z';
  draft.source.collection_window = { since: '2026-06-12T00:00:00.000Z', until: '2026-06-12T01:00:00.000Z' };
  draft.worklog.title = 'Share upload execution contract';
  return draft;
}

function defaultFlags() {
  return {
    json: false,
    yes: false,
    clipboard: false,
    noClipboard: false,
    openReview: false,
    noOpenReview: false,
    noSaveCursor: false
  } as const;
}

describe('share upload execution', () => {
  it('pauses human share uploads before preflight when confirmation is required', async () => {
    // Given: share collected a draft and the operator did not pass --yes.
    const draft = draftWithId('draft_share_upload_confirm_execution');
    let preflightCalled = false;
    let publishCalled = false;

    // When: the share upload branch is evaluated.
    const result = await runShareUploadCommand({
      cwd: '/tmp/agentfeed-share-upload-execution',
      draft,
      credentials,
      flags: defaultFlags(),
      dependencies: {
        requireUploadPreflight: async () => {
          preflightCalled = true;
          return metadata;
        },
        publishDraft: async () => {
          publishCalled = true;
          return upload;
        }
      }
    });

    // Then: no upload-side network work runs before explicit confirmation.
    expect(result).toEqual({
      kind: 'confirmation_required',
      draft,
      command: 'agentfeed publish --id draft_share_upload_confirm_execution --yes',
      extraCommand: 'agentfeed share --yes'
    });
    expect(preflightCalled).toBe(false);
    expect(publishCalled).toBe(false);
  });

  it('publishes JSON share uploads with explicit clipboard handoff and saved draft cursor update', async () => {
    // Given: JSON share upload has credentials and explicit clipboard handoff.
    const draft = draftWithId('draft_share_upload_json_execution');
    const savedDraft = draftWithId('draft_share_upload_json_execution');
    const publishReviewBaseUrls: Array<string | null | undefined> = [];
    const sanitizedDraftIds: string[] = [];
    const cursorMarks: Array<{ readonly window: CollectionWindow | null | undefined; readonly createdAt: string }> = [];
    const openPolicyCalls: Array<{ readonly openFlag: boolean; readonly respectConfig: boolean | undefined; readonly noOpen: boolean | undefined }> = [];
    const handoffCalls: Array<{ readonly copy: boolean; readonly open: boolean; readonly apiBaseUrl: string; readonly reviewBaseUrl: string | null | undefined }> = [];

    // When: upload execution completes in JSON mode.
    const result = await runShareUploadCommand({
      cwd: '/tmp/agentfeed-share-upload-execution',
      draft,
      credentials,
      flags: { ...defaultFlags(), json: true, clipboard: true },
      dependencies: {
        requireUploadPreflight: async () => metadata,
        publishDraft: async (options) => {
          publishReviewBaseUrls.push(options.reviewBaseUrl);
          return upload;
        },
        readDraft: async () => savedDraft,
        sanitizeDraftForOutput: async (_cwd, nextDraft) => {
          sanitizedDraftIds.push(nextDraft.id);
          return nextDraft;
        },
        markCollectionComplete: async (_cwd, window, createdAt) => {
          cursorMarks.push({ window, createdAt: createdAt.toISOString() });
        },
        shouldOpenReviewAfterUpload: async (openFlag, options) => {
          openPolicyCalls.push({ openFlag, respectConfig: options.respectConfig, noOpen: options.noOpen });
          return false;
        },
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

    // Then: JSON upload preserves publish, saved-draft, cursor, and handoff contracts.
    expect(result).toEqual({ kind: 'uploaded', draft: savedDraft, upload, handoff: noHandoff });
    expect(publishReviewBaseUrls).toEqual(['https://agentfeed.dev']);
    expect(sanitizedDraftIds).toEqual(['draft_share_upload_json_execution']);
    expect(cursorMarks).toEqual([{ window: savedDraft.source.collection_window, createdAt: '2026-06-12T01:30:00.000Z' }]);
    expect(openPolicyCalls).toEqual([{ openFlag: false, respectConfig: false, noOpen: false }]);
    expect(handoffCalls).toEqual([{ copy: true, open: false, apiBaseUrl: 'https://api.agentfeed.dev/v1', reviewBaseUrl: 'https://agentfeed.dev' }]);
  });

  it('publishes human share uploads with default clipboard handoff and project-aware open policy', async () => {
    // Given: human share upload has explicit --yes and no handoff suppression.
    const draft = draftWithId('draft_share_upload_human_execution');
    const openPolicyCalls: Array<{ readonly openFlag: boolean; readonly respectConfig: boolean | undefined; readonly noOpen: boolean | undefined }> = [];
    const handoffCalls: Array<{ readonly copy: boolean; readonly open: boolean }> = [];

    // When: upload execution completes in human mode.
    const result = await runShareUploadCommand({
      cwd: '/tmp/agentfeed-share-upload-execution',
      draft,
      credentials,
      flags: { ...defaultFlags(), yes: true, openReview: true },
      dependencies: {
        requireUploadPreflight: async () => metadata,
        publishDraft: async () => upload,
        markCollectionComplete: async () => undefined,
        shouldOpenReviewAfterUpload: async (openFlag, options) => {
          openPolicyCalls.push({ openFlag, respectConfig: options.respectConfig, noOpen: options.noOpen });
          return true;
        },
        handoffReviewUrl: async (_reviewUrl, options) => {
          handoffCalls.push({ copy: options.copy, open: options.open });
          return noHandoff;
        }
      }
    });

    // Then: human upload keeps default clipboard and project-aware browser policy.
    expect(result).toEqual({ kind: 'uploaded', draft, upload, handoff: noHandoff });
    expect(openPolicyCalls).toEqual([{ openFlag: true, respectConfig: undefined, noOpen: false }]);
    expect(handoffCalls).toEqual([{ copy: true, open: true }]);
  });
});
