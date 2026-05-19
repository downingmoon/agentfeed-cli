import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { previewDraftRemote, publishDraft } from '../src/api/client.js';
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
