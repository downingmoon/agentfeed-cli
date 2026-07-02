import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-upload-response-'));
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

describe('CLI upload response safety', () => {
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

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'API_RESPONSE_INVALID' });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it.each([
    {
      label: 'invalid JSON',
      response: () => new Response('{not-valid-json', { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API returned an invalid JSON upload response. Local draft was kept.'
    },
    {
      label: 'missing data envelope',
      response: () => new Response(JSON.stringify({ id: 'worklog_missing_envelope' }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API upload response is missing the data envelope. Local draft was kept.'
    }
  ])('rejects malformed upload success envelopes and keeps the draft pending: $label', async ({ response, message }) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const fetchMock = vi.fn(async () => response());
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({
        status: 502,
        code: 'API_RESPONSE_INVALID',
        message
      });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

  it.each([
    'https://agentfeed.downingmoon.dev/review/worklog_bad_url',
    'https://agentfeed.downingmoon.dev/worklogs/worklog_other/review',
    'https://agentfeed.downingmoon.dev/worklogs/worklog_bad/review?token=leak',
    'https://agentfeed.downingmoon.dev/worklogs/worklog_bad/review#secret',
    'https://agentfeed.downingmoon.dev/worklogs/worklog_bad',
    'https://agentfeed.api.downingmoon.dev/worklogs/worklog_bad/review'
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

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' } }))
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
        review_url: 'https://agentfeed.downingmoon.dev/worklogs/worklog_bad_status/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } })));

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' } }))
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

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: { ingestion_token: 'tok', api_base_url: 'https://agentfeed.api.downingmoon.dev/v1', created_at: 'now' } }))
      .rejects.toMatchObject({ code: 'DUPLICATE_INGESTION_SESSION' });

    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload.uploaded).toBe(false);
  });

});
