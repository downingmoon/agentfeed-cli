import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createEmptyDraft } from '../src/draft/create.js';
import { previewDraftRemote } from '../src/api/client.js';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-remote-preview-'));
});

afterEach(async () => {
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe('CLI remote preview contract', () => {
  it('remote preview posts the ingest payload and returns backend warnings', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: { valid: true, preview: { title: 'Draft title', summary: 'Draft summary', user_note: null, model: 'gpt-5.5', metrics_row: '0 files' }, warnings: ['check privacy'] }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await previewDraftRemote(draft, { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' });

    expect(result.warnings).toEqual(['check privacy']);
    expect(result.preview).toEqual({ title: 'Draft title', summary: 'Draft summary', user_note: null, model: 'gpt-5.5', metrics_row: '0 files' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.agentfeed.dev/v1/ingest/worklogs/preview', expect.objectContaining({ method: 'POST' }));
  });

  it.each([
    {
      label: 'invalid JSON',
      response: () => new Response('{not-valid-json', { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API returned an invalid JSON upload response. Local draft was kept.'
    },
    {
      label: 'missing data envelope',
      response: () => new Response(JSON.stringify({ valid: true, preview: {} }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API upload response is missing the data envelope. Local draft was kept.'
    },
    {
      label: 'unexpected data envelope field',
      response: () => new Response(JSON.stringify({ data: { valid: true, preview: { title: 'Draft title', summary: 'Draft summary', user_note: null, model: null, metrics_row: '0 files' }, warnings: [] }, debug: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API upload response has unexpected data envelope fields. Local draft was kept.'
    },
    {
      label: 'missing preview metrics row',
      response: () => new Response(JSON.stringify({ data: { valid: true, preview: { title: 'Draft title', summary: 'Draft summary', user_note: null, model: null }, warnings: [] } }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API remote preview response contract mismatch. Local draft was kept.'
    },
    {
      label: 'malformed warnings',
      response: () => new Response(JSON.stringify({ data: { valid: true, preview: { title: 'Draft title', summary: 'Draft summary', user_note: null, model: null, metrics_row: '0 files' }, warnings: 'none' } }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API remote preview response contract mismatch. Local draft was kept.'
    },
    {
      label: 'malformed valid flag',
      response: () => new Response(JSON.stringify({ data: { valid: 'yes', preview: { title: 'Draft title', summary: 'Draft summary', user_note: null, model: null, metrics_row: '0 files' }, warnings: [] } }), { status: 200, headers: { 'content-type': 'application/json' } }),
      message: 'AgentFeed API remote preview response contract mismatch. Local draft was kept.'
    }
  ])('rejects malformed remote preview success envelopes clearly: $label', async ({ response, message }) => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    const fetchMock = vi.fn(async () => response());
    vi.stubGlobal('fetch', fetchMock);

    await expect(previewDraftRemote(draft, { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' }))
      .rejects.toMatchObject({
        status: 502,
        code: 'API_RESPONSE_INVALID',
        message
      });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
