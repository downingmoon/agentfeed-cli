import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initProject } from '../src/config/project-config.js';
import { writeDraft } from '../src/draft/write.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { AgentFeedApiError, publishDraft } from '../src/api/client.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;
const oldAgentFeedDraftUploadLockTimeoutMs = process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
const oldAgentFeedDraftUploadLockHeartbeatMs = process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS;
const defaultPublishCredentials = { ingestion_token: 'tok', api_base_url: 'https://api.agentfeed.dev/v1', created_at: 'now' };

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-upload-lock-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  process.env.HOME = oldHome;
  if (oldAgentFeedDraftUploadLockTimeoutMs === undefined) delete process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
  else process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = oldAgentFeedDraftUploadLockTimeoutMs;
  if (oldAgentFeedDraftUploadLockHeartbeatMs === undefined) delete process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS;
  else process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = oldAgentFeedDraftUploadLockHeartbeatMs;
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('CLI upload lock contract', () => {
  it('fails fast without uploading when the draft upload lock is held', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    await writeFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), JSON.stringify({ pid: 999999, token: 'active-lock', created_at: new Date().toISOString() }));
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = '1';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toMatchObject({
        status: 423,
        code: 'DRAFT_UPLOAD_LOCKED',
        message: expect.stringContaining(draft.id),
        details: expect.objectContaining({
          draft_id: draft.id,
          owner_pid: 999999,
          lock_path: join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`),
          stale_after_ms: expect.any(Number),
          waited_ms: expect.any(Number),
          lock_fingerprint: expect.any(String)
        })
      });
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), 'utf8')).resolves.toContain('active-lock');
  });

  it('keeps fresh upload locks while the owner heartbeat is current', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    const now = new Date().toISOString();
    await writeFile(lockPath, JSON.stringify({ pid: process.pid, token_hash: 'live-lock-hash', created_at: now, heartbeat_at: now }));
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = '1';
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_live_lock_race',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_live_lock_race/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    let error: unknown;
    await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }).catch((caught) => {
      error = caught;
    });
    expect(error).toMatchObject({
      status: 423,
      code: 'DRAFT_UPLOAD_LOCKED',
      message: expect.stringContaining('Last heartbeat:')
    });
    if (!(error instanceof AgentFeedApiError)) throw new Error('expected AgentFeedApiError');
    expect(error.details).toMatchObject({
      draft_id: draft.id,
      owner_pid: process.pid,
      lock_created_at: now,
      lock_heartbeat_at: now,
      heartbeat_age_ms: expect.any(Number),
      lock_fingerprint: expect.any(String)
    });
    expect(JSON.stringify(error.details)).not.toContain('live-lock-hash');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(readFile(lockPath, 'utf8')).resolves.toContain('live-lock-hash');
  });

  it('does not persist raw upload lock tokens and releases only matching lock hashes', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    let observedLock = '';
    vi.stubGlobal('fetch', vi.fn(async () => {
      observedLock = await readFile(lockPath, 'utf8');
      return new Response(JSON.stringify({
        data: {
          id: 'worklog_lock_hash',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'https://agentfeed.dev/worklogs/worklog_lock_hash/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }));

    await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

    const parsed = JSON.parse(observedLock) as Record<string, unknown>;
    expect(parsed.token_hash).toEqual(expect.any(String));
    expect(Object.hasOwn(parsed, 'token')).toBe(false);
  });

  it('fails closed without saving upload metadata when lock heartbeat fails during upload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = '10';
    const fetchMock = vi.fn(async () => {
      await rm(lockPath, { force: true });
      await new Promise(resolve => setTimeout(resolve, 50));
      return new Response(JSON.stringify({
        data: {
          id: 'worklog_heartbeat_failed',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'https://agentfeed.dev/worklogs/worklog_heartbeat_failed/review',
          created_at: '2026-05-19T00:00:00Z'
        }
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials }))
      .rejects.toMatchObject({
        status: 423,
        code: 'DRAFT_UPLOAD_LOCK_HEARTBEAT_FAILED'
      });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
    expect(saved.upload).toMatchObject({ uploaded: false });
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('removes stale upload locks even when an unrelated process reuses the recorded pid without heartbeat', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'claude_code' });
    await writeDraft(dir, draft);
    const lockPath = join(dir, '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`);
    await writeFile(lockPath, JSON.stringify({
      pid: process.pid,
      token_hash: 'old-lock-hash',
      created_at: new Date(Date.now() - 10 * 60_000).toISOString(),
      heartbeat_at: new Date(Date.now() - 10 * 60_000).toISOString()
    }));
    const oldTimestamp = new Date(Date.now() - 10 * 60_000);
    await utimes(lockPath, oldTimestamp, oldTimestamp);
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {
        id: 'worklog_pid_reuse',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'https://agentfeed.dev/worklogs/worklog_pid_reuse/review',
        created_at: '2026-05-19T00:00:00Z'
      }
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await publishDraft({ cwd: dir, id: draft.id, credentials: defaultPublishCredentials });

    expect(result.id).toBe('worklog_pid_reuse');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await expect(readFile(lockPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
