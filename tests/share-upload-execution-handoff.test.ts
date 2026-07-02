import { describe, expect, it } from 'vitest';
import { runShareUploadCommand } from '../src/cli/share-upload-execution.js';
import type { CollectionWindow } from '../src/types.js';
import { credentials, defaultFlags, draftWithId, metadata, noHandoff, upload } from './share-upload-execution-helpers.js';

describe('share upload execution handoff', () => {
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
    expect(publishReviewBaseUrls).toEqual(['https://agentfeed.downingmoon.dev']);
    expect(sanitizedDraftIds).toEqual(['draft_share_upload_json_execution']);
    expect(cursorMarks).toEqual([{ window: savedDraft.source.collection_window, createdAt: '2026-06-12T01:30:00.000Z' }]);
    expect(openPolicyCalls).toEqual([{ openFlag: false, respectConfig: false, noOpen: false }]);
    expect(handoffCalls).toEqual([{ copy: true, open: false, apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1', reviewBaseUrl: 'https://agentfeed.downingmoon.dev' }]);
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
