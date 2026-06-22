import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
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
const oldAgentFeedCi = process.env.AGENTFEED_CI;
const oldCi = process.env.CI;
const oldGithubActions = process.env.GITHUB_ACTIONS;
const oldAgentFeedToken = process.env.AGENTFEED_TOKEN;
const oldAgentFeedReviewBaseUrl = process.env.AGENTFEED_REVIEW_BASE_URL;
const oldAgentFeedAllowInsecureApi = process.env.AGENTFEED_ALLOW_INSECURE_API;

const defaultPublishCredentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };



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
