import { describe, expect, it, vi } from 'vitest';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { cachedUploadReusableForCredentials, cachedUploadReuseStatusForCredentials, draftUploadCredentialBindingHash, draftUploadPayloadHash, publishDraft } from '../src/api/client.js';
import { defaultPublishCredentials, dir, readSavedDraft, savedUploadPayloadHash, uploadBinding, useCachedUploadReuseContractEnvironment } from './cli-cached-upload-reuse-helpers.js';

useCachedUploadReuseContractEnvironment();

describe('CLI cached upload reuse contract', () => {
  it('publish reuses an already uploaded draft instead of uploading again', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Already uploaded but still contains sk-abcdefghijklmnopqrstuvwxyz1234567890';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      uploaded_at: '2026-05-19T00:00:00Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...uploadBinding()
    };
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => { throw new Error('must not upload'); });
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

    expect(result).toMatchObject({
      id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      reused_existing: true
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const saved = await readSavedDraft(draft.id);
    expect(saved).toMatchObject({
      worklog: { summary: 'Already uploaded but still contains [REDACTED_SECRET]' },
      privacy_scan: { status: 'danger' }
    });
  });

  it('does not reuse an uploaded draft cache from a different credential binding', async () => {
    const oldCredentials = { ingestion_token: 'old-token', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'old', token_id: 'token-old', user: { id: 'user-old' } };
    const newCredentials = { ingestion_token: 'new-token', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'new', token_id: 'token-new', user: { id: 'user-new' } };
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Already uploaded under another credential binding';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_old_account',
      review_url: 'https://agentfeed.dev/worklogs/worklog_old_account/review',
      uploaded_at: '2026-05-19T00:00:00Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...uploadBinding(oldCredentials)
    };
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_new_account',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_new_account/review',
        created_at: '2026-05-20T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: newCredentials });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      id: 'worklog_new_account',
      review_url: 'https://agentfeed.dev/worklogs/worklog_new_account/review',
      reused_existing: undefined
    });
    expect(await readSavedDraft(draft.id)).toMatchObject({
      upload: {
        uploaded: true,
        worklog_id: 'worklog_new_account',
        credential_binding_hash: draftUploadCredentialBindingHash(newCredentials),
        token_id: 'token-new',
        user_id: 'user-new'
      }
    });
  });

  it('reports cached upload reusable only when redacted payload and credential binding both match', () => {
    const credentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Reusable cache contains sk-abcdefghijklmnopqrstuvwxyz1234567890';
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_reusable',
      review_url: 'https://agentfeed.dev/worklogs/worklog_reusable/review',
      uploaded_at: '2026-05-19T00:00:00Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...uploadBinding(credentials)
    };

    expect(cachedUploadReusableForCredentials(draft, credentials)).toBe(true);
    expect(cachedUploadReuseStatusForCredentials(draft, credentials)).toEqual({ reusable: true });

    const editedDraft = structuredClone(draft);
    editedDraft.worklog.title = 'Edited after upload';
    expect(cachedUploadReusableForCredentials(editedDraft, credentials)).toBe(false);
    expect(cachedUploadReuseStatusForCredentials(editedDraft, credentials)).toEqual({ reusable: false, reason: 'payload_hash_mismatch', canRetry: true });
    expect(cachedUploadReusableForCredentials(draft, { ...credentials, ingestion_token: 'different-token' })).toBe(false);
    expect(cachedUploadReuseStatusForCredentials(draft, { ...credentials, ingestion_token: 'different-token' })).toEqual({ reusable: false, reason: 'credential_binding_mismatch', canRetry: true });

    const missingReviewUrl = structuredClone(draft);
    delete missingReviewUrl.upload.review_url;
    expect(cachedUploadReuseStatusForCredentials(missingReviewUrl, credentials)).toEqual({ reusable: false, reason: 'missing_review_url', canRetry: true });

    const baseUrlMismatch = structuredClone(draft);
    baseUrlMismatch.upload.api_base_url = 'https://api.other.example/v1';
    expect(cachedUploadReuseStatusForCredentials(baseUrlMismatch, credentials)).toEqual({ reusable: false, reason: 'base_url_mismatch', canRetry: true });
  });

  it('reuses an unchanged uploaded draft after the first upload redacts public fields', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'First upload contains sk-abcdefghijklmnopqrstuvwxyz1234567890';
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { id: 'worklog_redacted_reuse', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_redacted_reuse/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });
    expect(first.id).toBe('worklog_redacted_reuse');
    const afterFirst = await readSavedDraft(draft.id);
    expect(afterFirst).toMatchObject({
      worklog: { summary: 'First upload contains [REDACTED_SECRET]' },
      privacy_scan: { status: 'danger' }
    });

    fetchMock.mockClear();
    const second = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(second).toMatchObject({
      id: 'worklog_redacted_reuse',
      review_url: 'https://agentfeed.dev/worklogs/worklog_redacted_reuse/review',
      reused_existing: true
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const afterSecond = await readSavedDraft(draft.id);
    expect(afterSecond).toMatchObject({ privacy_scan: { status: 'danger' } });
    expect(savedUploadPayloadHash(afterSecond)).toBe(savedUploadPayloadHash(afterFirst));
  });
});
