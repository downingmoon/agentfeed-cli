import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

function configureUploadRetryEnv(values: { readonly timeoutMs?: string; readonly attempts?: string; readonly baseDelayMs?: string }): () => void {
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

function recordField(value: unknown, field: string): unknown {
  return typeof value === 'object' && value !== null && field in value
    ? value[field as keyof typeof value]
    : undefined;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-upload-timeout-'));
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

describe('CLI upload timeout reconciliation contract', () => {
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
    const requestBodies: unknown[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      requestBodies.push(JSON.parse(String(init?.body ?? '{}')));
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
    const firstSource = recordField(requestBodies[0], 'source');
    const secondSource = recordField(requestBodies[1], 'source');
    expect(recordField(secondSource, 'local_draft_id')).toBe(recordField(firstSource, 'local_draft_id'));
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
});
