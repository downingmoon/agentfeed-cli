import { describe, expect, it } from 'vitest';
import { runShareUploadCommand } from '../src/cli/share-upload-execution.js';
import { credentials, defaultFlags, draftWithId, metadata, noHandoff, upload } from './share-upload-execution-helpers.js';

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

  it('passes a retry command into upload preflight for JSON share uploads', async () => {
    // Given: JSON share upload has credentials and a collected draft id.
    const draft = draftWithId('draft_share_upload_json_retry_guidance');
    const preflightCalls: unknown[][] = [];

    // When: upload preflight runs before publish.
    await runShareUploadCommand({
      cwd: '/tmp/agentfeed-share-upload-execution',
      draft,
      credentials,
      flags: { ...defaultFlags(), json: true, clipboard: true },
      dependencies: {
        requireUploadPreflight: async (...args) => {
          preflightCalls.push(args);
          return metadata;
        },
        publishDraft: async () => upload,
        readDraft: async () => draft,
        sanitizeDraftForOutput: async (_cwd, nextDraft) => nextDraft,
        markCollectionComplete: async () => undefined,
        shouldOpenReviewAfterUpload: async () => false,
        handoffReviewUrl: async () => noHandoff
      }
    });

    // Then: recovery output can tell JSON users exactly which share command to retry.
    expect(preflightCalls).toEqual([[credentials, { retryCommand: 'agentfeed share --json --yes' }]]);
  });

  it('passes a retry command into upload preflight for human share uploads', async () => {
    // Given: human share upload has explicit confirmation and a collected draft id.
    const draft = draftWithId('draft_share_upload_human_retry_guidance');
    const preflightCalls: unknown[][] = [];

    // When: upload preflight runs before publish.
    await runShareUploadCommand({
      cwd: '/tmp/agentfeed-share-upload-execution',
      draft,
      credentials,
      flags: { ...defaultFlags(), yes: true },
      dependencies: {
        requireUploadPreflight: async (...args) => {
          preflightCalls.push(args);
          return metadata;
        },
        publishDraft: async () => upload,
        markCollectionComplete: async () => undefined,
        shouldOpenReviewAfterUpload: async () => false,
        handoffReviewUrl: async () => noHandoff
      }
    });

    // Then: recovery output can tell human users exactly which publish command to retry.
    expect(preflightCalls).toEqual([[credentials, { retryCommand: 'agentfeed publish --id draft_share_upload_human_retry_guidance --yes' }]]);
  });
});
