import type { AgentFeedCredentials, LocalDraft } from '../types.js';
import { shortHash } from '../utils/hash.js';
import { draftToIngestRequest } from './ingest-request.js';

export function draftUploadPayloadHash(draft: LocalDraft): string {
  return shortHash(JSON.stringify(draftToIngestRequest(draft)), 32);
}

export function draftUploadCredentialBindingHash(credentials: AgentFeedCredentials): string {
  return shortHash(JSON.stringify({
    api_base_url: credentials.api_base_url,
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null,
    token_fingerprint: shortHash(credentials.ingestion_token, 16)
  }), 32);
}
