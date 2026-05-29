import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { checkApiReachability, checkIngestionToken, createCliAuthSession, draftToIngestRequest, exchangeCliAuthSession, previewDraftRemote, publishDraft } from '../src/api/client.js';
import { waitForCliAuthExchange } from '../src/auth/browser-login.js';
import { installClaudeCodeHook, uninstallClaudeCodeHook } from '../src/hooks/claude-code-settings.js';

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
  });

  it('checks API reachability against the backend health endpoint', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkApiReachability('http://localhost:8001/v1');

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/health' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8001/health', expect.objectContaining({ method: 'GET' }));
  });

  it('checks ingestion token validity without uploading a draft', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await checkIngestionToken({ ingestion_token: 'af_live_test', api_base_url: 'http://localhost:8001/v1', created_at: 'now' });

    expect(result).toMatchObject({ ok: true, status: 200, url: 'http://localhost:8001/v1/ingest/status' });
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
          user: { id: 'user-1', username: 'downingmoon' }
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1', deviceName: 'devbox' });
    const exchange = await exchangeCliAuthSession('https://api.agentfeed.dev/v1', session.session_id, 'verifier-1');

    expect(session.authorize_url).toContain('/cli/authorize');
    expect(exchange.token).toBe('af_live_test');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.agentfeed.dev/v1/auth/cli/sessions', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.agentfeed.dev/v1/auth/cli/sessions/session-1/exchange', expect.objectContaining({ method: 'POST' }));
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
