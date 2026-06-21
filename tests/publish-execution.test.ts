import { describe, expect, it } from 'vitest';
import type { ApiMetadata, PublishDraftResult } from '../src/api/client.js';
import type { CredentialsResolution } from '../src/config/credentials.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../src/types.js';
import { runPublishCommand } from '../src/cli/publish-execution.js';
import type { UploadPreflightOptions } from '../src/cli/upload-guidance.js';

const credentials: AgentFeedCredentials = {
  api_base_url: 'https://api.agentfeed.dev/v1',
  ingestion_token: 'af_live_publish_execution',
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
  id: 'worklog_publish_execution',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.dev/worklogs/worklog_publish_execution/review',
  review_base_url: 'https://agentfeed.dev',
  created_at: '2026-06-12T01:00:00.000Z'
};

const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-publish-execution', source: 'codex' });
  draft.id = id;
  draft.worklog.title = 'Publish execution contract';
  return draft;
}

function defaultFlags() {
  return {
    json: false,
    yes: false,
    clipboard: false,
    noClipboard: false,
    openReview: false,
    noOpenReview: false
  } as const;
}

describe('publish execution', () => {
  it('pauses before upload when confirmation is required', async () => {
    // Given: a draft exists and the operator did not pass --yes or --json.
    const draft = draftWithId('draft_publish_confirm_execution');
    let preflightCalled = false;
    let publishCalled = false;

    // When: direct publish execution is evaluated.
    const result = await runPublishCommand({
      cwd: '/tmp/agentfeed-publish-execution',
      id: draft.id,
      flags: defaultFlags(),
      dependencies: {
        readDraft: async () => draft,
        loadCredentials: async () => credentials,
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

    // Then: no network upload or preflight runs before explicit confirmation.
    expect(result).toEqual({
      kind: 'confirmation_required',
      draft,
      command: 'agentfeed publish --id draft_publish_confirm_execution --yes'
    });
    expect(preflightCalled).toBe(false);
    expect(publishCalled).toBe(false);
  });

  it('publishes JSON mode with explicit clipboard handoff and config-independent open policy', async () => {
    // Given: JSON publish skips confirmation and asks for clipboard handoff explicitly.
    const draft = draftWithId('draft_publish_json_execution');
    const savedDraft = draftWithId('draft_publish_json_execution');
    const readDraftIds: string[] = [];
    const publishReviewBaseUrls: Array<string | null | undefined> = [];
    const openPolicyCalls: Array<{ readonly openFlag: boolean; readonly respectConfig: boolean | undefined; readonly noOpen: boolean | undefined }> = [];
    const handoffCalls: Array<{ readonly copy: boolean; readonly open: boolean; readonly apiBaseUrl: string; readonly reviewBaseUrl: string | null | undefined }> = [];

    // When: publish execution completes in JSON mode.
    const result = await runPublishCommand({
      cwd: '/tmp/agentfeed-publish-execution',
      id: draft.id,
      flags: { ...defaultFlags(), json: true, clipboard: true },
      dependencies: {
        readDraft: async (_cwd, id) => {
          readDraftIds.push(id);
          return readDraftIds.length === 1 ? draft : savedDraft;
        },
        loadCredentials: async () => credentials,
        requireUploadPreflight: async () => metadata,
        publishDraft: async (options) => {
          publishReviewBaseUrls.push(options.reviewBaseUrl);
          return upload;
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

    // Then: the helper owns upload execution and preserves JSON handoff policy.
    expect(result).toEqual({ kind: 'published', draft: savedDraft, upload, handoff: noHandoff });
    expect(readDraftIds).toEqual(['draft_publish_json_execution', 'draft_publish_json_execution']);
    expect(publishReviewBaseUrls).toEqual(['https://agentfeed.dev']);
    expect(openPolicyCalls).toEqual([{ openFlag: false, respectConfig: false, noOpen: false }]);
    expect(handoffCalls).toEqual([{ copy: true, open: false, apiBaseUrl: 'https://api.agentfeed.dev/v1', reviewBaseUrl: 'https://agentfeed.dev' }]);
  });

  it('throws login guidance before preflight when credentials are missing', async () => {
    // Given: a draft exists but no AgentFeed credentials are available.
    const draft = draftWithId('draft_publish_missing_token_execution');
    let preflightCalled = false;

    // When/Then: publish fails with login guidance before any upload preflight.
    await expect(runPublishCommand({
      cwd: '/tmp/agentfeed-publish-execution',
      id: draft.id,
      flags: { ...defaultFlags(), yes: true },
      dependencies: {
        readDraft: async () => draft,
        loadCredentials: async () => null,
        requireUploadPreflight: async () => {
          preflightCalled = true;
          return metadata;
        }
      }
    })).rejects.toThrow('AgentFeed token is missing.');
    expect(preflightCalled).toBe(false);
  });

  it('passes saved credential provenance into upload preflight diagnostics', async () => {
    // Given: publish is using a saved keychain token, not AGENTFEED_TOKEN.
    const draft = draftWithId('draft_publish_keychain_context');
    const savedDraft = draftWithId('draft_publish_keychain_context');
    const resolution: CredentialsResolution = {
      credentials,
      token_source: 'keychain',
      credentials_file_path: '/Users/test/.agentfeed/credentials.json',
      credentials_file_exists: true,
      credential_store: 'keychain',
      api_base_url: credentials.api_base_url,
      api_base_url_source: 'stored_credentials',
      warnings: []
    };
    let preflightOptions: UploadPreflightOptions | null = null;

    // When: publish reaches upload preflight.
    await runPublishCommand({
      cwd: '/tmp/agentfeed-publish-execution',
      id: draft.id,
      flags: { ...defaultFlags(), yes: true },
      dependencies: {
        readDraft: async () => preflightOptions ? savedDraft : draft,
        loadCredentialsWithMetadata: async () => resolution,
        requireUploadPreflight: async (_credentials, options) => {
          preflightOptions = options;
          return metadata;
        },
        publishDraft: async () => upload,
        shouldOpenReviewAfterUpload: async () => false,
        handoffReviewUrl: async () => noHandoff
      }
    });

    // Then: a 401 preflight failure can explain that an empty AGENTFEED_TOKEN is normal for saved credentials.
    expect(preflightOptions).toEqual({
      retryCommand: 'agentfeed publish --id draft_publish_keychain_context --yes',
      credentialContext: {
        tokenSourceLabel: 'OS keychain',
        credentialStoreLabel: 'OS keychain',
        apiBaseUrl: 'https://api.agentfeed.dev/v1',
        apiBaseSourceLabel: 'saved credentials file',
        credentialsFilePath: '/Users/test/.agentfeed/credentials.json'
      }
    });
  });
});
