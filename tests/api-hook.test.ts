import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { checkApiReachability, checkIngestionToken, createCliAuthSession, draftToIngestRequest, exchangeCliAuthSession, previewDraftRemote, publishDraft, rotateIngestionToken } from '../src/api/client.js';
import { browserLogin, waitForCliAuthExchange } from '../src/auth/browser-login.js';
import { installClaudeCodeHook, uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';
import { pathExists } from '../src/utils/fs.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-api-'));
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

describe('api client', () => {
  it('publish sends expected payload and updates draft metadata', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { id: 'worklog_1', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/review/1', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(result.review_url).toBe('https://agentfeed.dev/review/1');
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/ingest/worklogs', expect.objectContaining({ method: 'POST' }));
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: true, worklog_id: 'worklog_1', review_url: 'https://agentfeed.dev/review/1' });
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
      return new Response(JSON.stringify({ data: { id: 'worklog_redacted', status: 'needs_review', visibility: 'private', review_url: 'https://agentfeed.dev/review/redacted', created_at: '2026-05-19T00:00:00Z' } }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(ingestPayload?.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(ingestPayload?.worklog.public_prompt).toBe('Use [REDACTED_SECRET] carefully');
    expect(ingestPayload?.project.repository_url).toBe('[REDACTED_URL]');
    expect(ingestPayload?.privacy_scan.status).toBe('danger');
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(saved.worklog.public_prompt).toBe('Use [REDACTED_SECRET] carefully');
    expect(saved.project.repository_url).toBe('[REDACTED_URL]');
    expect(saved.privacy_scan.status).toBe('danger');
  });

  it('publish reuses an already uploaded draft instead of uploading again', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      uploaded_at: '2026-05-19T00:00:00Z'
    };
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => { throw new Error('must not upload'); });
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });

    expect(result).toMatchObject({
      id: 'worklog_existing',
      review_url: 'https://agentfeed.dev/worklogs/worklog_existing/review',
      reused_existing: true
    });
    expect(fetchMock).not.toHaveBeenCalled();
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


  it('rotates the current ingestion token without printing or uploading draft data', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'token-new',
        name: 'CLI: MacBook',
        token: 'af_live_new_secret',
        created_at: '2026-05-30T00:00:00Z',
        expires_at: '2026-06-15T00:00:00Z',
        token_expires_at: '2026-06-15T00:00:00Z',
        rotated_from: 'token-old',
        rotated_at: '2026-05-30T00:01:00Z',
        user: { id: 'user-1', username: 'downingmoon' }
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await rotateIngestionToken({ ingestion_token: 'af_live_old_secret', api_base_url: 'http://localhost:8001/v1', created_at: 'now' });

    expect(result).toMatchObject({ id: 'token-new', token: 'af_live_new_secret', rotated_from: 'token-old' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/v1/ingest/token/rotate', expect.objectContaining({
      method: 'POST',
      headers: { authorization: 'Bearer af_live_old_secret' }
    }));
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

  it('strips URL userinfo from non-HTTP repository URLs before upload', () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.project.repository_url = 'ssh://deploy:secret-token@git.example/group/repo.git';

    const payload = draftToIngestRequest(draft);

    expect(payload.project.repository_url).toBe('ssh://git.example/group/repo.git');
    expect(JSON.stringify(payload)).not.toContain('secret-token');
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

  it('checks API reachability against the backend health endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiReachability('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/health' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/health', expect.objectContaining({ method: 'GET' }));
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
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-1',
            authorize_url: 'http://localhost:3000/cli/authorize?session_id=session-1',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 2
          }
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      return new Response(JSON.stringify({
        data: {
          token: 'af_live_test',
          token_expires_at: '2026-06-15T00:00:00Z',
          user: { id: 'user-1', username: 'downingmoon' }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' });
    const exchange = await exchangeCliAuthSession('https://api.agentfeed.dev/v1', session.session_id, 'verifier-1');

    expect(session.authorize_url).toContain('/cli/authorize');
    expect(exchange.token).toBe('af_live_test');
    expect(exchange.token_expires_at).toBe('2026-06-15T00:00:00Z');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-1/exchange', expect.objectContaining({ method: 'POST' }));
  });

  it('times out upload requests and keeps the draft pending', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const oldTimeout = process.env.AGENTFEED_API_TIMEOUT_MS;
    process.env.AGENTFEED_API_TIMEOUT_MS = '10';
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      const signal = init?.signal;
      if (!(signal instanceof AbortSignal)) return Promise.reject(new Error('missing abort signal'));
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      const pending = publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } });
      await expect(pending).rejects.toMatchObject({ code: 'API_REQUEST_TIMEOUT' });
    } finally {
      if (oldTimeout === undefined) delete process.env.AGENTFEED_API_TIMEOUT_MS;
      else process.env.AGENTFEED_API_TIMEOUT_MS = oldTimeout;
    }

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

  it('rejects upload success responses with unknown statuses', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_bad_status',
        status: 'surprise_public',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/review/bad-status',
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

  it('completes no-open browser login by exchanging the CLI session and saving credentials', async () => {
    let sessionVerifier: string | undefined;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/cli/sessions')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as { verifier?: string; device_name?: string };
        expect(body.verifier).toMatch(/^[a-f0-9]{64}$/);
        expect(body.device_name).toBeTruthy();
        sessionVerifier = body.verifier;
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-no-open',
            authorize_url: 'http://localhost:3000/cli/authorize?session_id=session-no-open',
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

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1', noOpen: true, waitMs: 50 });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-no-open', username: 'cli-user' }
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-no-open/exchange', expect.objectContaining({ method: 'POST' }));
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8').then(JSON.parse)).resolves.toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_no_open',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-no-open', username: 'cli-user' }
    });
  });

  it('completes no-open browser login without saving credentials when requested', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/cli/sessions')) {
        return new Response(JSON.stringify({
          data: {
            session_id: 'session-ephemeral',
            authorize_url: 'http://localhost:3000/cli/authorize?session_id=session-ephemeral',
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

    const creds = await browserLogin({ apiBaseUrl: 'https://api.agentfeed.dev/v1/', noOpen: true, waitMs: 50, save: false });

    expect(creds).toMatchObject({
      api_base_url: 'https://api.agentfeed.dev/v1',
      ingestion_token: 'af_live_ephemeral',
      token_expires_at: '2026-06-15T00:00:00Z',
      user: { id: 'user-ephemeral', username: 'no-save-user' }
    });
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
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

  it.each([
    [401, 'INGESTION_TOKEN_INVALID', /login|token/i],
    [413, 'INGESTION_PAYLOAD_TOO_LARGE', /too large/i],
    [422, 'VALIDATION_ERROR', /validation/i],
    [429, 'RATE_LIMITED', /rate limited/i]
  ])('publish handles API error %s', async (status, code, message) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code, message: 'boom', details: { retry_after_seconds: 10 } } }), { status, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } })).rejects.toThrow(message);
  });
});

describe('Claude Code hook installer', () => {
  it('does not create settings.json when uninstalling with no existing Claude config', async () => {
    const settings = join(dir, '.claude', 'settings.json');

    expect(await pathExists(settings)).toBe(false);
    await uninstallClaudeCodeHook({ projectRoot: dir, settingsPath: settings });

    expect(await pathExists(settings)).toBe(false);
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
});
