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
const oldAgentFeedReviewBaseUrl = process.env.AGENTFEED_REVIEW_BASE_URL;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-split-review-host-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedReviewBaseUrl === undefined) delete process.env.AGENTFEED_REVIEW_BASE_URL;
  else process.env.AGENTFEED_REVIEW_BASE_URL = oldAgentFeedReviewBaseUrl;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('CLI split review frontend host contract', () => {
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
});
