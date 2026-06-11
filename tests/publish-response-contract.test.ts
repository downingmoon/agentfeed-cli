import { describe, expect, it } from 'vitest';
import { AgentFeedApiError } from '../src/api/errors.js';
import { parsePublishDraftResult } from '../src/api/publish-response.js';

const apiBaseUrl = 'https://api.agentfeed.dev/v1';
const validUploadResponse: Record<string, unknown> = {
  id: 'worklog_contract',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.dev/worklogs/worklog_contract/review',
  created_at: '2026-06-11T00:00:00Z',
  reused_existing: false,
};

function parseInvalidUploadResponse(payload: Record<string, unknown>): AgentFeedApiError {
  try {
    parsePublishDraftResult(payload, apiBaseUrl);
  } catch (error) {
    if (error instanceof AgentFeedApiError) return error;
    throw error;
  }
  throw new Error('invalid upload response was accepted');
}

describe('publish response contract', () => {
  it('keeps ingest review URL handoff separate from private draft fields', () => {
    const privateFieldResponses: readonly Record<string, unknown>[] = [
      { ...validUploadResponse, user_note: 'private owner note' },
      { ...validUploadResponse, source: { agent: 'codex', session_id: 'session-private' } },
      { ...validUploadResponse, source_json: { local_draft_id: 'draft-private' } },
    ];

    for (const payload of privateFieldResponses) {
      const error = parseInvalidUploadResponse(payload);
      expect(error.code).toBe('API_RESPONSE_INVALID');
    }
  });
});
