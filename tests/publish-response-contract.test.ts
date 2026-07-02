import { describe, expect, it } from 'vitest';
import { AgentFeedApiError } from '../src/api/errors.js';
import { parsePublishDraftResult, parseRemotePreviewResult } from '../src/api/publish-response.js';

const apiBaseUrl = 'https://agentfeed.api.downingmoon.dev/v1';
const validUploadResponse: Record<string, unknown> = {
  id: 'worklog_contract',
  status: 'needs_review',
  visibility: 'private',
  review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_contract/review',
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
  it('rejects remote preview responses with unexpected fields', () => {
    const validPreviewResponse = {
      valid: true,
      preview: {
        title: 'Preview title',
        summary: 'Preview summary',
        user_note: null,
        model: 'gpt-5.5',
        metrics_row: 'Tokens 100 · Files 2',
      },
      warnings: ['review before publishing'],
    };

    expect(parseRemotePreviewResult(validPreviewResponse)).toMatchObject({
      valid: true,
      preview: { title: 'Preview title', summary: 'Preview summary' },
      warnings: ['review before publishing'],
    });

    const invalidPreviewResponses = [
      { ...validPreviewResponse, debug: true },
      { ...validPreviewResponse, preview: { ...validPreviewResponse.preview, raw_prompt: 'hidden' } },
    ];

    for (const payload of invalidPreviewResponses) {
      expect(() => parseRemotePreviewResult(payload)).toThrow(AgentFeedApiError);
    }
  });

  it('preserves backend reused_existing false and rejects non-boolean values', () => {
    expect(parsePublishDraftResult(validUploadResponse, apiBaseUrl).reused_existing).toBe(false);

    const error = parseInvalidUploadResponse({ ...validUploadResponse, reused_existing: 'false' });
    expect(error.code).toBe('API_RESPONSE_INVALID');
  });

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
