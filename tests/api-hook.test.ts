import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { AgentFeedApiError, cachedUploadReusableForCredentials, cachedUploadReuseStatusForCredentials, draftUploadCredentialBindingHash, draftUploadPayloadHash, publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedCi = process.env.AGENTFEED_CI;
const oldCi = process.env.CI;
const oldGithubActions = process.env.GITHUB_ACTIONS;
const oldAgentFeedToken = process.env.AGENTFEED_TOKEN;
const oldAgentFeedReviewBaseUrl = process.env.AGENTFEED_REVIEW_BASE_URL;
const oldAgentFeedAllowInsecureApi = process.env.AGENTFEED_ALLOW_INSECURE_API;
const oldAgentFeedDraftUploadLockTimeoutMs = process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
const oldAgentFeedDraftUploadLockHeartbeatMs = process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS;

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

it('keeps CLI visibility contract aligned with backend-supported values', async () => {
  const typesSource = await readFile(join(process.cwd(), 'src', 'types.ts'), 'utf8');
  const clientSource = await readFile(join(process.cwd(), 'src', 'api', 'client.ts'), 'utf8');
  const publishResponseSource = await readFile(join(process.cwd(), 'src', 'api', 'publish-response.ts'), 'utf8');

  expect(typesSource).toContain("export type Visibility = 'private' | 'unlisted' | 'public';");
  expect(typesSource).not.toContain("'team'");
  expect(clientSource).toContain("export type { PublishDraftResult, PublishDraftStatus, PublishDraftVisibility, RemotePreviewPayload, RemotePreviewResult } from './publish-response.js';");
  expect(publishResponseSource).toContain("export type PublishDraftVisibility = 'private';");
  expect(publishResponseSource).toContain("const REMOTE_PRIVATE_REVIEW_UPLOAD_STATUS = 'needs_review' satisfies PublishDraftStatus;");
  expect(publishResponseSource).toContain("export const CACHED_PRIVATE_REVIEW_UPLOAD_STATUS = 'already_uploaded' satisfies PublishDraftStatus;");
  expect(publishResponseSource).toContain("const PUBLISH_DRAFT_RESULT_FIELDS = new Set(['id', 'status', 'visibility', 'review_url', 'created_at', 'reused_existing']);");
  expect(publishResponseSource).not.toContain("const VALID_PRIVATE_REVIEW_UPLOAD_STATUSES");
  expect(clientSource).not.toContain("Visibility, WorklogStatus");
});

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
  if (oldAgentFeedAllowInsecureApi === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
  else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAgentFeedAllowInsecureApi;
  if (oldAgentFeedDraftUploadLockTimeoutMs === undefined) delete process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
  else process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = oldAgentFeedDraftUploadLockTimeoutMs;
  if (oldAgentFeedDraftUploadLockHeartbeatMs === undefined) delete process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS;
  else process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = oldAgentFeedDraftUploadLockHeartbeatMs;
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
        code: 'DRAFT_UPLOAD_LOCKED',
        message: expect.stringContaining(draft.id),
        details: expect.objectContaining({
          draft_id: draft.id,
          owner_pid: 999999,
          lock_path: join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`),
          stale_after_ms: expect.any(Number),
          waited_ms: expect.any(Number),
          lock_fingerprint: expect.any(String)
        })
      });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), 'utf8')).resolves.toContain('active-lock');
  });

  it('keeps fresh upload locks while the owner heartbeat is current', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    const now = new Date().toISOString();
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, token_hash: 'live-lock-hash', created_at: now, heartbeat_at: now }));
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

    let error: unknown;
    await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }).catch((caught) => {
      error = caught;
    });
    expect(error).toMatchObject({
      status: 423,
      code: 'DRAFT_UPLOAD_LOCKED',
      message: expect.stringContaining('Last heartbeat:')
    });
    expect(error).toBeInstanceOf(AgentFeedApiError);
    expect((error as AgentFeedApiError).details).toMatchObject({
      draft_id: draft.id,
      owner_pid: process.pid,
      lock_created_at: now,
      lock_heartbeat_at: now,
      heartbeat_age_ms: expect.any(Number),
      lock_fingerprint: expect.any(String)
    });
    expect(JSON.stringify((error as AgentFeedApiError).details)).not.toContain('live-lock-hash');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(lockPath, 'utf8')).resolves.toContain('live-lock-hash');
  });

  it('does not persist raw upload lock tokens and releases only matching lock hashes', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    let observedLock = '';
    vi.stubGlobal('fetch', vi.fn(async () => {
      observedLock = await readFile(lockPath, 'utf8');
      return new Response(JSON.stringify({
        data: {
          id: 'worklog_lock_hash',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'https://agentfeed.dev/worklogs/worklog_lock_hash/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

    const parsed = JSON.parse(observedLock) as Record<string, unknown>;
    expect(parsed.token_hash).toEqual(expect.any(String));
    expect(Object.hasOwn(parsed, 'token')).toBe(false);
  });

  it('fails closed without saving upload metadata when lock heartbeat fails during upload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = '10';
    const fetchMock = vi.fn(async () => {
      await rm(lockPath, { force: true });
      await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(JSON.stringify({
        data: {
          id: 'worklog_heartbeat_failed',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'https://agentfeed.dev/worklogs/worklog_heartbeat_failed/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toMatchObject({
        status: 423,
        code: 'DRAFT_UPLOAD_LOCK_HEARTBEAT_FAILED'
      });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: false });
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('removes stale upload locks even when an unrelated process reuses the recorded pid without heartbeat', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    await writeFile(lockPath, JSON.stringify({
      pid: process.pid,
      token_hash: 'old-lock-hash',
      created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      heartbeat_at: new Date(Date.now() - 10 * 60_000).toISOString()
    }));
    const oldTimestamp = new Date(Date.now() - 10 * 60_000);
    await utimes(lockPath, oldTimestamp, oldTimestamp);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_pid_reuse',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_pid_reuse/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

    expect(result.id).toBe('worklog_pid_reuse');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
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

  it('rejects upload success responses with unexpected fields', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_extra_field',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_extra_field/review',
        created_at: '2026-05-19T00:00:00Z',
        raw_debug_payload: { hidden: true }
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
    expect(ingestPayload?.privacy_scan.findings.length).toBeGreaterThan(0);
    expect(ingestPayload?.privacy_scan.findings.some((finding: Record<string, unknown>) => Object.hasOwn(finding, 'sample_redacted'))).toBe(false);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.privacy_scan.findings.some((finding: Record<string, unknown>) => Object.hasOwn(finding, 'sample_redacted'))).toBe(true);
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

  it('rejects remote ingest upload statuses outside the backend needs_review contract', async () => {
    for (const status of ['draft', 'private', 'already_uploaded'] as const) {
      const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
      draft.id = `draft_remote_status_${status}`;
      await writeDraft(dir, draft);
      vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
        data: {
          id: `worklog_remote_status_${status}`,
          status,
          visibility: 'private',
          review_url: `https://agentfeed.dev/worklogs/worklog_remote_status_${status}/review`,
          created_at: '2026-05-20T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } })));

      await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
        .rejects.toMatchObject({ status: 502, code: 'API_RESPONSE_INVALID' });

      const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
      expect(saved.upload.uploaded).toBe(false);
    }
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


  it.each([
    [401, 'INGESTION_TOKEN_INVALID', /Login\/token problem.[\s\S]*Run: agentfeed rotate[\s\S]*AGENTFEED_TOKEN[\s\S]*Run: unset AGENTFEED_TOKEN && agentfeed rotate --browser/i],
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
