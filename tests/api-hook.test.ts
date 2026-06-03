import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm, mkdir, writeFile, readFile, chmod, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { apiMetadataCompatible, cachedUploadReusableForCredentials, checkApiCompatibility, checkApiReachability, checkIngestionToken, createCliAuthSession, draftToIngestRequest, draftUploadCredentialBindingHash, draftUploadPayloadHash, exchangeCliAuthSession, previewDraftRemote, publishDraft } from '../src/api/client.js';
import { browserLogin, waitForCliAuthExchange } from '../src/auth/browser-login.js';
import { buildClaudeCodeStopHookCommand, installClaudeCodeHook, uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';
import { pathExists } from '../src/utils/fs.js';
import { saveCredentials } from '../src/config/credentials.js';

let dir: string;
let home: string;
const execFileAsync = promisify(execFile);
const oldHome = process.env.HOME;
const oldAgentFeedCi = process.env.AGENTFEED_CI;
const oldCi = process.env.CI;
const oldGithubActions = process.env.GITHUB_ACTIONS;
const oldAgentFeedToken = process.env.AGENTFEED_TOKEN;
const oldAgentFeedReviewBaseUrl = process.env.AGENTFEED_REVIEW_BASE_URL;
const oldAgentFeedDraftUploadLockTimeoutMs = process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;

const defaultPublishCredentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };

function uploadBinding(credentials: typeof defaultPublishCredentials & { token_id?: string | null; user?: { id?: string } } = defaultPublishCredentials) {
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null,
  };
}

function configureUploadRetryEnv(values: { timeoutMs?: string; attempts?: string; baseDelayMs?: string }): () => void {
  const previous = {
    timeoutMs: process.env.AGENTFEED_API_TIMEOUT_MS,
    attempts: process.env.AGENTFEED_API_RETRY_ATTEMPTS,
    baseDelayMs: process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS
  };
  if (values.timeoutMs !== undefined) process.env.AGENTFEED_API_TIMEOUT_MS = values.timeoutMs;
  if (values.attempts !== undefined) process.env.AGENTFEED_API_RETRY_ATTEMPTS = values.attempts;
  if (values.baseDelayMs !== undefined) process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = values.baseDelayMs;
  return () => {
    if (previous.timeoutMs === undefined) delete process.env.AGENTFEED_API_TIMEOUT_MS;
    else process.env.AGENTFEED_API_TIMEOUT_MS = previous.timeoutMs;
    if (previous.attempts === undefined) delete process.env.AGENTFEED_API_RETRY_ATTEMPTS;
    else process.env.AGENTFEED_API_RETRY_ATTEMPTS = previous.attempts;
    if (previous.baseDelayMs === undefined) delete process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
    else process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = previous.baseDelayMs;
  };
}

function responseAfterAbort(init?: RequestInit): Promise<Response> {
  const signal = init?.signal;
  if (!(signal instanceof AbortSignal)) return Promise.reject(new Error('missing abort signal'));
  return new Promise<Response>((_resolve, reject) => {
    signal.addEventListener('abort', () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    });
  });
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-api-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  delete process.env.AGENTFEED_TRUST_REPO_API_BASE;
  if (oldAgentFeedCi === undefined) delete process.env.AGENTFEED_CI;
  else process.env.AGENTFEED_CI = oldAgentFeedCi;
  if (oldCi === undefined) delete process.env.CI;
  else process.env.CI = oldCi;
  if (oldGithubActions === undefined) delete process.env.GITHUB_ACTIONS;
  else process.env.GITHUB_ACTIONS = oldGithubActions;
  if (oldAgentFeedToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = oldAgentFeedToken;
  if (oldAgentFeedReviewBaseUrl === undefined) delete process.env.AGENTFEED_REVIEW_BASE_URL;
  else process.env.AGENTFEED_REVIEW_BASE_URL = oldAgentFeedReviewBaseUrl;
  if (oldAgentFeedDraftUploadLockTimeoutMs === undefined) delete process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
  else process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = oldAgentFeedDraftUploadLockTimeoutMs;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('api client', () => {
  it('publish sends expected payload and updates draft metadata', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { id: 'worklog_1', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_1/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(result.review_url).toBe('https://agentfeed.dev/worklogs/worklog_1/review');
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/ingest/worklogs', expect.objectContaining({ method: 'POST' }));
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: true, worklog_id: 'worklog_1', review_url: 'https://agentfeed.dev/worklogs/worklog_1/review' });
  });

  it('serializes concurrent publishes for the same draft before upload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
      return new Response(JSON.stringify({
        data: {
          id: 'worklog_concurrent',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'https://agentfeed.dev/worklogs/worklog_concurrent/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const results = await Promise.all([
      publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }),
      publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } })
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({
        id: 'worklog_concurrent',
        review_url: 'https://agentfeed.dev/worklogs/worklog_concurrent/review'
      }),
      expect.objectContaining({
        id: 'worklog_concurrent',
        review_url: 'https://agentfeed.dev/worklogs/worklog_concurrent/review'
      })
    ]);
    expect(results.some((result) => result.reused_existing === true)).toBe(true);
    expect(results.find((result) => result.reused_existing === true)).toMatchObject({
      id: 'worklog_concurrent',
      review_url: 'https://agentfeed.dev/worklogs/worklog_concurrent/review',
      reused_existing: true
    });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: true, worklog_id: 'worklog_concurrent' });
  });

  it('fails fast without uploading when the draft upload lock is held', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    await writeFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), JSON.stringify({ pid: 999999, token: 'active-lock', created_at: new Date().toISOString() }));
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = '1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({
        status: 423,
        code: 'DRAFT_UPLOAD_LOCKED'
      });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), 'utf8')).resolves.toContain('active-lock');
  });

  it('keeps stale-looking upload locks when the owner process is still alive', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, token: 'live-stale-lock', created_at: new Date(Date.now() - 10 * 60_000).toISOString() }));
    const oldTimestamp = new Date(Date.now() - 10 * 60_000);
    await utimes(lockPath, oldTimestamp, oldTimestamp);
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = '1';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_live_lock_race',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_live_lock_race/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toMatchObject({
        status: 423,
        code: 'DRAFT_UPLOAD_LOCKED'
      });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(lockPath, 'utf8')).resolves.toContain('live-stale-lock');
  });

  it('accepts upload review URLs from an explicitly configured split review frontend host', async () => {
    process.env.AGENTFEED_REVIEW_BASE_URL = 'https://review.internal.example';
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_split_host',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://review.internal.example/worklogs/worklog_split_host/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.internal.example/v1', created_at: 'now' } });

    expect(result.review_url).toBe('https://review.internal.example/worklogs/worklog_split_host/review');
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_split_host',
      review_url: 'https://review.internal.example/worklogs/worklog_split_host/review'
    });
  });

  it('accepts upload review URLs from metadata-provided split review frontend host', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_metadata_split_host',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://review.internal.example/worklogs/worklog_metadata_split_host/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    const result = await publishDraft({
      cwd: dir,
      id: draft.id,
      credentials: { ingestion_token: 'tok', api_base_url: 'https://api.internal.example/v1', created_at: 'now' },
      reviewBaseUrl: 'https://review.internal.example'
    });

    expect(result.review_url).toBe('https://review.internal.example/worklogs/worklog_metadata_split_host/review');
    expect(result.review_base_url).toBe('https://review.internal.example');
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_metadata_split_host',
      review_url: 'https://review.internal.example/worklogs/worklog_metadata_split_host/review',
      review_base_url: 'https://review.internal.example'
    });
  });

  it.each([
    { status: 'public', visibility: 'public' },
    { status: 'unlisted', visibility: 'unlisted' },
    { status: 'needs_review', visibility: 'team' }
  ])('rejects upload success responses outside private-review states: %j', async ({ status, visibility }) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: `worklog_${visibility}`,
        status,
        visibility,
        review_url: `https://agentfeed.dev/worklogs/worklog_${visibility}/review`,
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it('re-scans manually edited draft fields before upload and persists redactions', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.worklog.summary = 'Deploy with sk-abcdefghijklmnopqrstuvwxyz1234567890';
    draft.worklog.public_prompt = 'Use ghp_abcdefghijklmnopqrstuvwxyz1234567890 carefully';
    draft.project.repository_url = 'http://localhost:3000/private-repo';
    await writeDraft(dir, draft);
    let ingestPayload: Record<string, any> | null = null;
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      ingestPayload = JSON.parse(String(init?.body ?? '{}')) as Record<string, any>;
      return new Response(JSON.stringify({ data: { id: 'worklog_redacted', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_redacted/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(ingestPayload?.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(ingestPayload?.worklog.public_prompt).toBe('Use [REDACTED_SECRET] carefully');
    expect(ingestPayload?.project.repository_url).toBeNull();
    expect(ingestPayload?.privacy_scan.status).toBe('danger');
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(saved.worklog.public_prompt).toBe('Use [REDACTED_SECRET] carefully');
    expect(saved.project.repository_url).toBe('[REDACTED_URL]');
    expect(saved.privacy_scan.status).toBe('danger');
  });

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

    const editedDraft = structuredClone(draft);
    editedDraft.worklog.title = 'Edited after upload';
    expect(cachedUploadReusableForCredentials(editedDraft, credentials)).toBe(false);
    expect(cachedUploadReusableForCredentials(draft, { ...credentials, ingestion_token: 'different-token' })).toBe(false);
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

  it('publish treats duplicate ingestion with a review URL as a successful resync', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: 'DUPLICATE_INGESTION_SESSION',
        message: 'Duplicate ingestion session.',
        details: {
          worklog_id: 'worklog_existing',
          review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }
    }), { status: 409, headers: { 'content-type': 'application/json' } })));

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(result).toMatchObject({
      id: 'worklog_existing',
      status: 'already_uploaded',
      visibility: 'private',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      reused_existing: true
    });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      uploaded_at: '2026-05-19T00:00:00Z'
    });
  });

  it('reconciles duplicate ingestion review URLs that use the /review/:id route', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: 'DUPLICATE_INGESTION_SESSION',
        message: 'Duplicate ingestion session.',
        details: {
          review_url: 'https://agentfeed.dev/worklogs/worklog_review_route/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }
    }), { status: 409, headers: { 'content-type': 'application/json' } })));

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(result).toMatchObject({
      id: 'worklog_review_route',
      status: 'already_uploaded',
      review_url: 'https://agentfeed.dev/worklogs/worklog_review_route/review',
      reused_existing: true
    });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_review_route',
      review_url: 'https://agentfeed.dev/worklogs/worklog_review_route/review'
    });
  });

  it('retries transient ingest upload failures before marking the draft uploaded', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const oldRetryDelay = process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
    process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = '0';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'try again' } }), { status: 503, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'worklog_retry', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_retry/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

      expect(result.id).toBe('worklog_retry');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
      expect(saved.upload).toMatchObject({ uploaded: true, worklog_id: 'worklog_retry' });
    } finally {
      if (oldRetryDelay === undefined) delete process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
      else process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = oldRetryDelay;
    }
  });

  it('does not retry validation errors during ingest upload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'bad draft' } }), { status: 422, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toThrow(/validation/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries rate-limited ingest uploads when the API provides a retry window', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const oldRetryDelay = process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
    process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = '0';
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'try later', details: { retry_after_seconds: 0 } } }), { status: 429, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'worklog_rate_limit_retry', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_rate_limit_retry/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

      expect(result.id).toBe('worklog_rate_limit_retry');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (oldRetryDelay === undefined) delete process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
      else process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = oldRetryDelay;
    }
  });

  it.each([
    { data: { token: '' }, label: 'empty token' },
    { data: { token: 'af_live_test', token_id: 123 }, label: 'invalid token_id' },
    { data: { token: 'af_live_bad_expiry', token_expires_at: 'not-a-date' }, label: 'invalid token_expires_at' },
    { data: { token: 'af_live_test', rotated_from: ['token-old'] }, label: 'invalid rotated_from' },
    { data: { token: 'af_live_test', rotated_at: 'tomorrow-ish' }, label: 'invalid rotated_at' },
    { data: { token: 'af_live_bad_user', user: { id: 123 } }, label: 'unsafe user object' }
  ])('rejects malformed browser exchange responses before credentials can be saved: $label', async ({ data }) => {
    await saveCredentials('af_live_existing', {
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      user: { id: 'user-existing', username: 'existing' },
      tokenExpiresAt: '2026-06-01T00:00:00Z'
    });
    const before = await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({
          data: {
            service: 'agentfeed-api',
            api_version: 'v1',
            backend_version: '0.1.0',
            contract_version: '2026-06-03',
            review_base_url: 'https://agentfeed.dev',
            supported_clients: {
              cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
              frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
            }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-bad-exchange',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-bad-exchange',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ data }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).resolves.toBe(before);
  });

  it('remote preview posts the ingest payload and returns backend warnings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: { valid: true, preview: { title: 'Draft title', metrics_row: '0 files' }, warnings: ['check privacy'] }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await previewDraftRemote(draft, { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' });

    expect(result.warnings).toEqual(['check privacy']);
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/ingest/worklogs/preview', expect.objectContaining({ method: 'POST' }));
  });

  it('preserves collection window and fingerprint in ingest source payload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.source.host_label = 'Downing MacBook';
    draft.source.session_id = 'raw-agent-session-id';
    draft.source.collection_window = {
      since: '2026-05-24T00:00:00.000Z',
      until: '2026-05-24T00:10:00.000Z'
    };
    draft.source.collection_window_reason = 'idle_gap';
    draft.source.collection_fingerprint = 'agentfeed-window-fingerprint';

    const payload = draftToIngestRequest(draft);

    expect(payload.source.collection_window).toEqual(draft.source.collection_window);
    expect(payload.source.collection_window_reason).toBe('idle_gap');
    expect(payload.source.collection_fingerprint).toBe('agentfeed-window-fingerprint');
    expect(payload.source.host_label).toBeUndefined();
    expect(payload.source.session_id).not.toBe('raw-agent-session-id');
    expect(payload.source.session_id).toMatch(/^session_[a-f0-9]{16}$/);
    expect(payload.source.local_draft_id).not.toBe(draft.id);
    expect(payload.source.local_draft_id).toMatch(/^draft_[a-f0-9]{16}$/);
  });

  it('strips credentials from repository URLs before upload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.project.repository_url = 'https://oauth2:secret-token@gitlab.example/group/repo.git';

    const payload = draftToIngestRequest(draft);

    expect(payload.project.repository_url).toBe('https://gitlab.example/group/repo.git');
    expect(JSON.stringify(payload)).not.toContain('secret-token');
  });

  it.each([
    'ssh://deploy:secret-token@git.example/group/repo.git',
    'git@github.com:org/private.git'
  ])('omits non-HTTP repository remotes before upload: %s', (remote) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.project.repository_url = remote;

    const payload = draftToIngestRequest(draft);

    expect(payload.project.repository_url).toBeNull();
    expect(JSON.stringify(payload)).not.toContain('secret-token');
    expect(JSON.stringify(payload)).not.toContain('git@github.com');
  });

  it('includes the collected model in the ingest worklog payload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.model = 'gpt-5.5';

    const payload = draftToIngestRequest(draft);

    expect(payload.worklog.model).toBe('gpt-5.5');
  });

  it('redacts uploaded string metadata outside the summary fields', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    const secret = 'sk-123456789012345678901234';
    draft.worklog.model = `model-${secret}`;
    draft.worklog.metrics.agent_modes = [`agent-mode-${secret}`];

    const payload = draftToIngestRequest(draft);

    expect(JSON.stringify(payload)).not.toContain(secret);
    expect(payload.worklog.model).toBe('model-[REDACTED_SECRET]');
    expect(payload.worklog.metrics.agent_modes).toEqual(['agent-mode-[REDACTED_SECRET]']);
  });

  it('sends share notes as user_note instead of folding them into generated summaries', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = 'Generated machine summary.';
    draft.worklog.user_note = 'Human review context.';

    const payload = draftToIngestRequest(draft);

    expect(payload.worklog.summary).toBe('Generated machine summary.');
    expect(payload.worklog.user_note).toBe('Human review context.');
  });

  it('checks API compatibility metadata before release-sensitive operations', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        service: 'agentfeed-api',
        api_version: 'v1',
        backend_version: '0.1.0',
        contract_version: '2026-06-03',
        review_base_url: 'https://agentfeed.dev',
        supported_clients: {
          cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
          frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiCompatibility('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, compatible: true, status: 200, url: 'http://localhost:8001/v1/metadata' });
    expect(result.data?.contract_version).toBe('2026-06-03');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/v1/metadata', expect.objectContaining({ method: 'GET' }));
    expect(apiMetadataCompatible({
      ...result.data,
      supported_clients: {
        ...result.data?.supported_clients,
        cli: { min_version: 'not-a-version', contract_version: '2026-06-03' }
      }
    })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: undefined })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: 'http://review.internal.example' })).toBe(false);
    expect(apiMetadataCompatible({ ...result.data, review_base_url: 'https://review.internal.example/path' })).toBe(false);
  });

  it('checks API reachability against the backend readiness endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'ready', database: { connected: true }, migration: { up_to_date: true } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiReachability('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/health/ready' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/health/ready', expect.objectContaining({ method: 'GET' }));
  });

  it('checks ingestion token validity without uploading a draft and parses lifecycle metadata', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        ok: true,
        token: {
          id: 'token-1',
          name: 'CLI: MacBook',
          expires_at: '2026-06-15T00:00:00Z',
          expires_in_seconds: 1_000_000,
          expiring_soon: false
        }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkIngestionToken({ ingestion_token: 'af_live_test', api_base_url: 'http://localhost:8001/v1', created_at: 'now' });

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/v1/ingest/status' });
    expect(result.data?.token?.expires_at).toBe('2026-06-15T00:00:00Z');
    expect(result.data?.token?.expiring_soon).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/v1/ingest/status', expect.objectContaining({
      method: 'GET',
      headers: { authorization: 'Bearer af_live_test' }
    }));
  });

  it('reports invalid ingestion token as an unhealthy token check', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID' } }), { status: 401, headers: { 'content-type': 'application/json' } })));

    await expect(checkIngestionToken({ ingestion_token: 'af_live_bad', api_base_url: 'http://localhost:8001/v1', created_at: 'now' })).resolves.toMatchObject({
      ok: false,
      status: 401
    });
  });

  it('creates and exchanges a browser login session', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      if (url.endsWith('/auth/cli/sessions')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { verifier?: string; device_name?: string; replace_token_id?: string };
        expect(body.replace_token_id).toBe('token-old');
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-1',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-1&status_token=status-token-for-session-1',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 2
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        data: {
          token: 'af_live_test',
          token_id: 'token-new',
          token_expires_at: '2026-06-15T00:00:00Z',
          rotated_from: 'token-old',
          rotated_at: '2026-05-30T00:01:00Z',
          user: { id: 'user-1', username: 'downingmoon' }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox', replaceTokenId: 'token-old' });
    const exchange = await exchangeCliAuthSession('https://api.agentfeed.dev/v1', session.session_id, 'verifier-1');

    expect(session.authorize_url).toContain('/cli/authorize');
    expect(session.authorize_url).toContain('status_token=status-token-for-session-1');
    expect(session.user_code).toBe('123-456');
    expect(exchange.token).toBe('af_live_test');
    expect(exchange.token_id).toBe('token-new');
    expect(exchange.token_expires_at).toBe('2026-06-15T00:00:00Z');
    expect(exchange.rotated_from).toBe('token-old');
    expect(exchange.rotated_at).toBe('2026-05-30T00:01:00Z');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-1/exchange', expect.objectContaining({ method: 'POST' }));
  });

  it('rejects browser login authorize URLs with unexpected query parameters', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-extra-query',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-extra-query&status_token=status-token-for-session-extra&next=https%3A%2F%2Fevil.example',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('rejects untrusted browser login authorize URLs before opening them', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-evil',
        authorize_url: 'https://evil.example/cli/authorize?session_id=session-evil',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('rejects browser login sessions without a human approval code', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-without-code',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-without-code',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 2
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('allows local authorize URLs only for local API bases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-local',
        authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-local',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('http://localhost:8001/v1', { verifier: 'verifier-local' }))
      .resolves.toMatchObject({ session_id: 'session-local' });
  });

  it('rejects fake 127-prefixed authorize hostnames for local API bases', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        session_id: 'session-fake-local',
        authorize_url: 'http://127.evil.com:3001/cli/authorize?session_id=session-fake-local',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(createCliAuthSession('http://localhost:8001/v1', { verifier: 'verifier-local' }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('times out upload requests and keeps the draft pending', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const restoreRetryEnv = configureUploadRetryEnv({ timeoutMs: '10', attempts: '2', baseDelayMs: '0' });
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => responseAfterAbort(init));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const pending = publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });
      await expect(pending).rejects.toMatchObject({
        code: 'API_REQUEST_TIMEOUT',
        message: expect.stringContaining('reconcile any server-side duplicate')
      });
    } finally {
      restoreRetryEnv();
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it('resolves an upload timeout after first attempt as duplicate ingest and marks draft uploaded', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const restoreRetryEnv = configureUploadRetryEnv({ timeoutMs: '10', attempts: '3', baseDelayMs: '0' });
    const requestBodies: Record<string, any>[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body ?? '{}')) as Record<string, any>);
      if (requestBodies.length === 1) {
        return responseAfterAbort(init);
      }
      return Promise.resolve(new Response(JSON.stringify({
        error: {
          code: 'DUPLICATE_INGESTION_SESSION',
          message: 'Duplicate ingestion session.',
          details: {
            worklog_id: 'worklog_timeout_existing',
            review_url: 'https://agentfeed.dev/worklogs/worklog_timeout_existing/review',
            created_at: '2026-05-19T00:00:00Z'
          }
        }
      }), { status: 409, headers: { 'content-type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

      expect(result).toMatchObject({
        id: 'worklog_timeout_existing',
        status: 'already_uploaded',
        reused_existing: true,
        review_url: 'https://agentfeed.dev/worklogs/worklog_timeout_existing/review',
        created_at: '2026-05-19T00:00:00Z'
      });
    } finally {
      restoreRetryEnv();
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(requestBodies).toHaveLength(2);
    expect(requestBodies[1].source.local_draft_id).toBe(requestBodies[0].source.local_draft_id);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({
      uploaded: true,
      worklog_id: 'worklog_timeout_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_timeout_existing/review',
      uploaded_at: '2026-05-19T00:00:00Z'
    });
  });

  it('keeps draft pending when timeout is followed by duplicate ingest with untrusted review URL', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const restoreRetryEnv = configureUploadRetryEnv({ timeoutMs: '10', attempts: '3', baseDelayMs: '0' });
    let callCount = 0;
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      callCount += 1;
      if (callCount === 1) {
        return responseAfterAbort(init);
      }
      return Promise.resolve(new Response(JSON.stringify({
        error: {
          code: 'DUPLICATE_INGESTION_SESSION',
          message: 'Duplicate ingestion session.',
          details: {
            worklog_id: 'worklog_timeout_existing',
            review_url: 'https://evil.example/worklogs/worklog_timeout_existing/review',
            created_at: '2026-05-19T00:00:00Z'
          }
        }
      }), { status: 409, headers: { 'content-type': 'application/json' } }));
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
        .rejects.toMatchObject({ code: 'DUPLICATE_INGESTION_SESSION' });
    } finally {
      restoreRetryEnv();
    }

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it('rejects malformed upload success responses and keeps the draft pending', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_bad',
        status: 'needs_review',
        visibility: 'private',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it.each([
    'https://agentfeed.dev/review/worklog_bad_url',
    'https://agentfeed.dev/worklogs/worklog_other/review',
    'https://agentfeed.dev/worklogs/worklog_bad/review?token=leak',
    'https://agentfeed.dev/worklogs/worklog_bad/review#secret',
    'https://agentfeed.dev/worklogs/worklog_bad',
    'https://api.agentfeed.dev/worklogs/worklog_bad/review'
  ])('rejects upload success responses with unsafe review URL %s', async (reviewUrl) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_bad_url',
        status: 'needs_review',
        visibility: 'private',
        review_url: reviewUrl,
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('rejects upload success responses with unknown statuses', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_bad_status',
        status: 'surprise_public',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_bad_status/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });
  });

  it('does not trust duplicate upload review URLs outside the expected origin', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      error: {
        code: 'DUPLICATE_INGESTION_SESSION',
        message: 'Duplicate ingestion session.',
        details: {
          worklog_id: 'worklog_existing',
          review_url: 'https://evil.example/worklogs/worklog_existing/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }
    }), { status: 409, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'DUPLICATE_INGESTION_SESSION' });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });


  it.each(['AGENTFEED_CI', 'CI', 'GITHUB_ACTIONS'])('fails fast in %s instead of opening browser auth when no token or browser override is provided', async (envName) => {
    process.env[envName] = '1';
    delete process.env.AGENTFEED_TOKEN;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const startedAt = Date.now();

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true }))
      .rejects.toThrow(/AGENTFEED_TOKEN|agentfeed login --token|--browser/);

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['AGENTFEED_CI', 'CI', 'GITHUB_ACTIONS'])('fails fast in %s instead of opening browser auth when an environment token already exists', async (envName) => {
    process.env[envName] = '1';
    process.env.AGENTFEED_TOKEN = 'af_live_existing_ci_token';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: {} }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const startedAt = Date.now();

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true }))
      .rejects.toThrow(/Browser login is disabled in CI|AGENTFEED_TOKEN|--browser/);

    expect(Date.now() - startedAt).toBeLessThan(1000);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('completes no-open browser login by exchanging the CLI session and saving credentials', async () => {
    let sessionVerifier: string | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({
          data: {
            service: 'agentfeed-api',
            api_version: 'v1',
            backend_version: '0.1.0',
            contract_version: '2026-06-03',
            review_base_url: 'https://agentfeed.dev',
            supported_clients: {
              cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
              frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
            }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { verifier?: string; device_name?: string };
        expect(body.verifier).toMatch(/^[a-f0-9]{64}$/);
        expect(body.device_name).toBeTruthy();
        sessionVerifier = body.verifier;
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-no-open',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-no-open',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions/session-no-open/exchange')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { verifier?: string };
        expect(body.verifier).toMatch(/^[a-f0-9]{64}$/);
        expect(body.verifier).toBe(sessionVerifier);
        return new Response(JSON.stringify({
          data: {
            token: 'af_live_no_open',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-no-open', username: 'cli-user' }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-no-open', username: 'cli-user' }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/metadata', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-no-open/exchange', expect.objectContaining({ method: 'POST' }));
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8').then(JSON.parse)).resolves.toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-no-open', username: 'cli-user' }
    });
  });

  it('refuses browser login before session creation and credential saving when API metadata is incompatible', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/metadata')) {
        return new Response(JSON.stringify({ data: { service: 'agentfeed-api', api_version: 'v0' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: { code: 'UNEXPECTED_SESSION_REQUEST' } }), { status: 500, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50, allowCiBrowser: true }))
      .rejects.toThrow(/API compatibility check failed.*before saving credentials/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/metadata', expect.objectContaining({ method: 'GET' }));
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('completes no-open browser login without saving credentials when requested', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-ephemeral',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-ephemeral',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      if (url.endsWith('/auth/cli/sessions/session-ephemeral/exchange')) {
        return new Response(JSON.stringify({
          data: {
            token: 'af_live_ephemeral',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-ephemeral', username: 'no-save-user' }
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1/', noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_ephemeral',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-ephemeral', username: 'no-save-user' }
    });
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });


  it('browser login ignores repo-local BACKEND_PORT discovery before auth unless explicitly trusted', async () => {
    await writeFile(join(dir, '.env'), 'BACKEND_PORT=8123\n');
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-default-api',
            authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-default-api',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions/session-default-api/exchange')) {
        return new Response(JSON.stringify({ data: { token: 'af_live_default_api' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ cwd: dir, noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds.api_base_url).toBe('https://api.agentfeed.dev/v1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
  });

  it('browser login accepts repo-local API discovery when AGENTFEED_TRUST_REPO_API_BASE=1', async () => {
    await writeFile(join(dir, '.env'), 'BACKEND_PORT=8124\n');
    process.env.AGENTFEED_TRUST_REPO_API_BASE = '1';
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-trusted-api',
            authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-trusted-api',
            user_code: '123-456',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.endsWith('/auth/cli/sessions/session-trusted-api/exchange')) {
        return new Response(JSON.stringify({ data: { token: 'af_live_trusted_api' } }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({ error: { code: 'NOT_FOUND' } }), { status: 404, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const creds = await browserLogin({ cwd: dir, noOpen: true, waitMs: 50, save: false, allowCiBrowser: true });

    expect(creds.api_base_url).toBe('http://localhost:8124/v1');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://localhost:8124/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
  });

  it('keeps polling the browser login session until it is approved', async () => {
    let attempts = 0;
    const exchange = vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('pending');
      }
      return { token: 'af_live_after_approval', user: { id: 'user-1' } };
    });

    const result = await waitForCliAuthExchange({
      apiBaseUrl: 'https://api.agentfeed.dev/v1',
      session: {
        session_id: 'session-1',
        authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-1',
        user_code: '123-456',
        expires_at: '2026-05-20T00:05:00Z',
        poll_interval_seconds: 1
      },
      verifier: 'verifier-1',
      exchange,
      sleep: async () => undefined,
      isPendingError: (error) => error instanceof Error && error.message === 'pending'
    });

    expect(result.token).toBe('af_live_after_approval');
    expect(exchange).toHaveBeenCalledTimes(2);
  });

  it('caps browser login polling sleep to the remaining timeout window', async () => {
    const sleeps: number[] = [];
    const exchange = vi.fn(async () => {
      throw new Error('pending');
    });
    const nowValues = [1000, 1000, 1001, 1019, 1019, 1020];
    let nowIndex = 0;
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => {
      const value = nowValues[Math.min(nowIndex, nowValues.length - 1)];
      nowIndex += 1;
      return value;
    });

    try {
      await expect(waitForCliAuthExchange({
        apiBaseUrl: 'https://api.agentfeed.dev/v1',
        session: {
          session_id: 'session-timeout',
          authorize_url: 'https://agentfeed.dev/cli/authorize?session_id=session-timeout',
          user_code: '123-456',
          expires_at: '2026-05-20T00:05:00Z',
          poll_interval_seconds: 60
        },
        verifier: 'verifier-timeout',
        waitMs: 20,
        exchange,
        sleep: async (ms) => {
          sleeps.push(ms);
        },
        isPendingError: (error) => error instanceof Error && error.message === 'pending'
      })).rejects.toThrow(/timed out/i);
    } finally {
      dateNow.mockRestore();
    }

    expect(exchange).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([19]);
  });

  it.each([
    [401, 'INGESTION_TOKEN_INVALID', /agentfeed rotate.*AGENTFEED_TOKEN.*rotate --browser/i],
    [413, 'INGESTION_PAYLOAD_TOO_LARGE', /too large/i],
    [422, 'VALIDATION_ERROR', /validation/i],
    [429, 'RATE_LIMITED', /rate limited/i]
  ])('publish handles API error %s', async (status, code, message) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const oldRetryAttempts = process.env.AGENTFEED_API_RETRY_ATTEMPTS;
    process.env.AGENTFEED_API_RETRY_ATTEMPTS = '1';
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code, message: 'boom', details: { retry_after_seconds: 10 } } }), { status, headers: { 'content-type': 'application/json' } })));

    try {
      await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } })).rejects.toThrow(message);
    } finally {
      if (oldRetryAttempts === undefined) delete process.env.AGENTFEED_API_RETRY_ATTEMPTS;
      else process.env.AGENTFEED_API_RETRY_ATTEMPTS = oldRetryAttempts;
    }
  });
});

describe('Claude Code hook installer', () => {
  it('does not create settings.json when uninstalling with no existing Claude config', async () => {
    const settings = join(dir, '.claude', 'settings.json');

    expect(await pathExists(settings)).toBe(false);
    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });

    expect(await pathExists(settings)).toBe(false);
  });

  it('fails hook install with actionable guidance when Claude settings JSON is malformed', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, '{not-json');

    await expect(installClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings could not be parsed.*settings\.json.*rerun agentfeed hook install claude-code/s);
  });

  it('rejects non-object Claude settings instead of replacing user configuration shape', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, '[]\n');

    await expect(installClaudeCodeHook({ projectRoot: dir, settingsPath: settings }))
      .rejects.toThrow(/Claude Code settings must be a JSON object.*settings\.json/s);
    expect(await readFile(settings, 'utf8')).toBe('[]\n');
  });


  it('installs a Stop hook command that logs collection failures but exits successfully', async () => {
    const binDir = await mkdtemp(join(tmpdir(), 'agentfeed-fake-bin-'));
    const fakeAgentFeed = join(binDir, 'agentfeed');
    await writeFile(fakeAgentFeed, [
      '#!/usr/bin/env sh',
      'echo "fake stdout: attempted $*"',
      'test -z "$AGENTFEED_TOKEN" || echo "leaked token: $AGENTFEED_TOKEN"',
      'test -z "$NPM_TOKEN" || echo "leaked npm: $NPM_TOKEN"',
      'test -z "$session_token" || echo "leaked lowercase session: $session_token"',
      'echo "fake stderr: uninitialized project" >&2',
      'exit 42',
      ''
    ].join('\n'));
    await chmod(fakeAgentFeed, 0o755);
    const previousLowercaseSession = process.env.session_token;

    try {
      process.env.session_token = 'lower_hook_secret_should_not_leak';
      const command = buildClaudeCodeStopHookCommand();
      const result = await execFileAsync('sh', ['-c', command], {
        cwd: dir,
        env: {
          ...process.env,
          PATH: `${binDir}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_hook_secret_should_not_leak',
          NPM_TOKEN: 'npm_hook_secret_should_not_leak',
          session_token: 'lower_hook_secret_should_not_leak',
        }
      });

      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('');
      const log = await readFile(join(dir, '.agentfeed', 'logs', 'hook.log'), 'utf8');
      expect(log).toContain('agentfeed Claude Code Stop hook start');
      expect(log).toContain('fake stdout: attempted collect --source claude-code');
      expect(log).toContain('fake stderr: uninitialized project');
      expect(log).toContain('failed with exit 42');
      expect(log).not.toContain('af_live_hook_secret_should_not_leak');
      expect(log).not.toContain('npm_hook_secret_should_not_leak');
      expect(log).not.toContain('lower_hook_secret_should_not_leak');
    } finally {
      if (previousLowercaseSession === undefined) delete process.env.session_token;
      else process.env.session_token = previousLowercaseSession;
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('installs Stop hook into empty settings, preserves settings, avoids duplicates, and uninstalls only AgentFeed hook', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({ theme: 'dark', hooks: { Stop: [{ matcher: '*', hooks: [{ type: 'command', command: 'echo keep' }] }] } }, null, 2));

    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    let json = JSON.parse(await readFile(settings, 'utf8'));
    expect(json.theme).toBe('dark');
    expect(JSON.stringify(json).match(/agentfeed collect/g)?.length).toBe(1);
    expect(JSON.stringify(json)).toContain('echo keep');

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    json = JSON.parse(await readFile(settings, 'utf8'));
    expect(JSON.stringify(json)).not.toContain('agentfeed collect');
    expect(JSON.stringify(json)).toContain('echo keep');
  });

  it('does not treat unrelated hook text mentioning agentfeed collect as the AgentFeed hook', async () => {
    const settings = join(dir, '.claude', 'settings.json');
    const unrelatedCommand = 'echo "documentation says agentfeed collect can be run manually"';
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(settings, JSON.stringify({
      hooks: {
        Stop: [{ matcher: '*', hooks: [{ type: 'command', command: unrelatedCommand }] }]
      }
    }, null, 2));

    await installClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    let json = JSON.parse(await readFile(settings, 'utf8'));
    let commands = json.hooks.Stop.flatMap((entry: any) => entry.hooks.map((hook: any) => hook.command));
    expect(commands).toContain(unrelatedCommand);
    expect(commands).toContain(buildClaudeCodeStopHookCommand());

    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });
    json = JSON.parse(await readFile(settings, 'utf8'));
    commands = json.hooks.Stop.flatMap((entry: any) => entry.hooks.map((hook: any) => hook.command));
    expect(commands).toContain(unrelatedCommand);
    expect(commands).not.toContain(buildClaudeCodeStopHookCommand());
  });
});
