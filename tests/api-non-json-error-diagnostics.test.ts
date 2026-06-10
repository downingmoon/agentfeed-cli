import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCliAuthSession, publishDraft } from '../src/api/client.js';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function captureError(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
    return null;
  } catch (error) {
    return error;
  }
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-api-error-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (oldHome === undefined) delete process.env.HOME;
  else process.env.HOME = oldHome;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('API non-JSON error diagnostics', () => {
  it('shows a bounded redacted diagnostic when CLI auth returns a non-JSON API error', async () => {
    const fetchMock = vi.fn(async () => new Response(
      '<html><h1>Bad Gateway</h1><p>token=af_live_super_secret Bearer abc.def.ghi https://user:pass@example.test/path?secret=value</p></html>',
      { status: 502, headers: { 'content-type': 'text/html; charset=utf-8' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    const error = await captureError(() => createCliAuthSession('https://api.agentfeed.dev/v1', { verifier: 'verifier-1' }));

    expect(error).toMatchObject({ status: 502, code: 'API_RESPONSE_INVALID' });
    expect(error).toBeInstanceOf(Error);
    expect(error instanceof Error ? error.message : '').toContain('non-JSON error response');
    expect(error instanceof Error ? error.message : '').toContain('HTTP 502');
    expect(error instanceof Error ? error.message : '').toContain('Bad Gateway');
    expect(error instanceof Error ? error.message : '').not.toMatch(/af_live_super_secret|abc\.def\.ghi|user:pass|secret=value/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps upload drafts pending when ingest returns a non-JSON API error diagnostic', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => new Response(
      'nginx unavailable token=af_live_upload_secret',
      { status: 503, headers: { 'content-type': 'text/plain' } }
    ));
    vi.stubGlobal('fetch', fetchMock);

    const error = await captureError(() => publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' } }));

    expect(error).toMatchObject({ status: 502, code: 'API_RESPONSE_INVALID' });
    expect(error).toBeInstanceOf(Error);
    expect(error instanceof Error ? error.message : '').toContain('Local draft was kept');
    expect(error instanceof Error ? error.message : '').toContain('nginx unavailable');
    expect(error instanceof Error ? error.message : '').not.toContain('af_live_upload_secret');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const saved: unknown = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    const upload = isRecord(saved) && isRecord(saved.upload) ? saved.upload : null;
    expect(upload?.uploaded).toBe(false);
  });
});
