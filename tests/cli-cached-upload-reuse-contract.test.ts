import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { cachedUploadReusableForCredentials, cachedUploadReuseStatusForCredentials, draftUploadCredentialBindingHash, draftUploadPayloadHash, publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const defaultPublishCredentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };

function uploadBinding(credentials: typeof defaultPublishCredentials & { token_id?: string | null; user?: { id?: string } } = defaultPublishCredentials) {
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null,
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-upload-cache-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

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
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Already uploaded but still contains [REDACTED_SECRET]');
    expect(saved.privacy_scan.status).toBe('danger');
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
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_new_account',
      credential_binding_hash: draftUploadCredentialBindingHash(newCredentials),
      token_id: 'token-new',
      user_id: 'user-new'
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
    const afterFirst = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(afterFirst.worklog.summary).toBe('First upload contains [REDACTED_SECRET]');
    expect(afterFirst.privacy_scan.status).toBe('danger');

    fetchMock.mockClear();
    const second = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(second).toMatchObject({
      id: 'worklog_redacted_reuse',
      review_url: 'https://agentfeed.dev/worklogs/worklog_redacted_reuse/review',
      reused_existing: true
    });
    expect(fetchMock).not.toHaveBeenCalled();
    const afterSecond = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(afterSecond.privacy_scan.status).toBe('danger');
    expect(afterSecond.upload.payload_hash).toBe(afterFirst.upload.payload_hash);
  });

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
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Edited locally with [REDACTED_SECRET]');
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_existing',
      payload_hash: uploadedPayloadHash
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
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
    expect(saved.upload.review_url).toBeUndefined();
  });
});
