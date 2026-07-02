import type { ApiMetadata, PublishDraftResult } from '../src/api/client.js';
import { createEmptyDraft } from '../src/draft/create.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../src/types.js';

export const credentials: AgentFeedCredentials = {
  api_base_url: 'https://agentfeed.api.downingmoon.dev/v1',
  ingestion_token: 'af_live_share_upload_execution',
  created_at: '2026-06-12T00:00:00.000Z'
};

export const metadata: ApiMetadata = {
  service: 'agentfeed-api',
  api_version: 'v1',
  backend_version: 'test',
  contract_version: '2026-06-12',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  supported_clients: {
    cli: { min_version: '0.2.0', contract_version: '2026-06-12' },
    frontend: { min_version: '0.2.0', contract_version: '2026-06-12' }
  }
};

export const upload: PublishDraftResult = {
  id: 'worklog_share_upload_execution',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_share_upload_execution/review',
  review_base_url: 'https://agentfeed.downingmoon.dev',
  created_at: '2026-06-12T01:00:00.000Z'
};

export const noHandoff: ReviewUrlHandoff = {
  clipboard: { requested: false, ok: null },
  browser: { requested: false, ok: null }
};

export function draftWithId(id: string): LocalDraft {
  const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/agentfeed-share-upload-execution', source: 'codex' });
  draft.id = id;
  draft.source.created_at = '2026-06-12T01:30:00.000Z';
  draft.source.collection_window = { since: '2026-06-12T00:00:00.000Z', until: '2026-06-12T01:00:00.000Z' };
  draft.worklog.title = 'Share upload execution contract';
  return draft;
}

export function defaultFlags() {
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
