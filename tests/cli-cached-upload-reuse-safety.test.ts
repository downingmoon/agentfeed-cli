import { describe, expect, it, vi } from 'vitest';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { draftUploadPayloadHash, publishDraft } from '../src/api/client.js';
import { dir, readSavedDraft, savedUploadReviewUrl, useCachedUploadReuseContractEnvironment } from './cli-cached-upload-reuse-helpers.js';

useCachedUploadReuseContractEnvironment();

describe('CLI cached upload reuse safety', () => {
  it('fails closed when an uploaded draft cache no longer matches the local redacted payload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Original private review payload';
    const uploadedPayloadHash = draftUploadPayloadHash(draft);
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      uploaded_at: '2026-05-19T00:00:00Z',
      payload_hash: uploadedPayloadHash
    };
    draft.worklog.summary = 'Edited locally with sk-abcdefghijklmnopqrstuvwxyz1234567890';
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => { throw new Error('must not upload a stale cached draft'); });
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({
        code: 'DRAFT_UPLOAD_STALE',
        details: {
          worklog_id: 'worklog_existing',
          review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review'
        }
      });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await readSavedDraft(draft.id)).toMatchObject({
      worklog: { summary: 'Edited locally with [REDACTED_SECRET]' },
      upload: {
        uploaded: true,
        worklog_id: 'worklog_existing',
        payload_hash: uploadedPayloadHash
      }
    });
  });

  it.each([
    'https://evil.example/worklogs/worklog_existing/review',
    'https://agentfeed.dev/worklogs/worklog_existing/review?token=leak',
    'https://agentfeed.dev/worklogs/worklog_existing/review#secret'
  ])('rejects cached uploaded draft review URLs before reuse: %s', async (reviewUrl) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: reviewUrl,
      uploaded_at: '2026-05-19T00:00:00Z'
    };
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => { throw new Error('must not upload'); });
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'DRAFT_UPLOAD_METADATA_INVALID' });

    expect(fetchMock).not.toHaveBeenCalled();
    const saved = await readSavedDraft(draft.id);
    expect(saved).toMatchObject({ upload: { uploaded: false } });
    expect(savedUploadReviewUrl(saved)).toBeUndefined();
  });
});
