import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const defaultPublishCredentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-ingest-upload-retry-'));
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

describe('CLI ingest upload retry and duplicate handling', () => {
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

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

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

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

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
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'try again', details: {} } }), { status: 503, headers: { 'content-type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 'worklog_retry', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/worklogs/worklog_retry/review', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

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
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'bad draft', details: {} } }), { status: 422, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toThrow(/validation/i);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { label: 'unexpected error envelope field', body: { error: { code: 'VALIDATION_ERROR', message: 'bad draft', details: {} }, debug: true } },
    { label: 'unexpected error detail field', body: { error: { code: 'VALIDATION_ERROR', message: 'bad draft', details: {}, debug: true } } },
    { label: 'missing details field', body: { error: { code: 'VALIDATION_ERROR', message: 'bad draft' } } }
  ])('rejects malformed ingest error responses and keeps the draft pending: $label', async ({ body }) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 422, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toMatchObject({
        status: 502,
        code: 'API_RESPONSE_INVALID',
        message: 'AgentFeed API returned an invalid error response. Local draft was kept.'
      });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: false });
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
      const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

      expect(result.id).toBe('worklog_rate_limit_retry');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (oldRetryDelay === undefined) delete process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS;
      else process.env.AGENTFEED_API_RETRY_BASE_DELAY_MS = oldRetryDelay;
    }
  });
});
