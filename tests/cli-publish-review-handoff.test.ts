import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
import {
  handlePublishJsonUploadPreflight,
  installFailingReviewUrlHandoff,
  installFakeBrowserOpener,
  readPublishJsonUploadRequestBody,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';

const fixture = usePublishJsonFixture();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseDraftId(text: string): string {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || typeof parsed.id !== 'string') throw new Error('collect output must include a draft id');
  return parsed.id;
}

function cachedUploadBindingForEnv(options: { readonly token?: string; readonly apiBaseUrl?: string } = {}) {
  const credentials = {
    ingestion_token: options.token ?? 'af_live_test_token',
    api_base_url: options.apiBaseUrl ?? 'https://api.agentfeed.dev/v1',
    created_at: 'now',
  };
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: null,
    user_id: null,
  };
}

async function startUploadPreflightServer(): Promise<{ readonly apiBaseUrl: string; readonly close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return {
    apiBaseUrl: `http://127.0.0.1:${address.port}/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve()))
  };
}

async function writeOpenReviewSession(): Promise<string> {
  const sessionFile = join(fixture.dir(), '.agentfeed', 'codex-open-review.jsonl');
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'open-review-session', cwd: fixture.dir(), model: 'gpt-open-review' } }),
    JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(fixture.dir(), 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = true;\n+export const autoOpen = true;\n' }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = true;\nexport const autoOpen = true;\n');
  return sessionFile;
}

function publishServer(options: { readonly id: string; readonly reviewUrl: string; readonly createdAt: string }) {
  const server = createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
      res.writeHead(404).end();
      return;
    }
    await readPublishJsonUploadRequestBody(req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      data: {
        id: options.id,
        status: 'needs_review',
        visibility: 'private',
        review_url: options.reviewUrl,
        created_at: options.createdAt
      }
    }));
  });
  return server;
}

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return `http://127.0.0.1:${address.port}/v1`;
}

describe('publish CLI review URL handoff policy', () => {
  it('opens the review URL after publish when project config enables it', async () => {
    const server = publishServer({
      id: 'worklog_auto_open',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_auto_open/review',
      createdAt: '2026-05-30T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);

    try {
      const sessionFile = await writeOpenReviewSession();
      const collect = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'collect',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all'
      ], { cwd: fixture.dir(), encoding: 'utf8', env: { ...process.env, HOME: fixture.home() } });
      const draftId = parseDraftId(collect.stdout);
      const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draftId, '--yes'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      expect(publish.stdout).toContain('Handoff');
      expect(publish.stdout).toContain('Review URL opened in browser.');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_auto_open/review\n');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('does not auto-open review URLs in CI unless explicitly requested', async () => {
    const preflight = await startUploadPreflightServer();
    const draft = fixture.createDraft();
    draft.upload = {
      uploaded: true,
      worklog_id: 'worklog_ci_no_open',
      review_url: 'http://localhost:3001/worklogs/worklog_ci_no_open/review',
      uploaded_at: '2026-05-31T00:00:00.000Z',
      payload_hash: draftUploadPayloadHash(draft),
      ...cachedUploadBindingForEnv({ apiBaseUrl: preflight.apiBaseUrl })
    };
    await fixture.writeDraftFile(draft);
    const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-ci-bin');
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
          CI: '1'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await preflight.close();
    }
  });

  it('lets users explicitly suppress configured review auto-open during publish', async () => {
    const server = publishServer({
      id: 'worklog_no_open_flag',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_no_open_flag/review',
      createdAt: '2026-06-03T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);

    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'No open flag';
      await fixture.writeDraftFile(draft);
      const fakeBin = join(fixture.dir(), '.agentfeed', 'fake-no-open-bin');
      const browserLog = await installFakeBrowserOpener(fakeBin);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--yes', '--no-open-review'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl,
          CI: '0',
          GITHUB_ACTIONS: '0',
          AGENTFEED_CI: '0'
        }
      });

      expect(publish.stdout).toContain('Review URL:');
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('prints visible warnings when publish review URL handoff fails in human output', async () => {
    const server = publishServer({
      id: 'worklog_publish_failed_handoff',
      reviewUrl: 'http://localhost:3001/worklogs/worklog_publish_failed_handoff/review',
      createdAt: '2026-06-01T00:00:00.000Z'
    });
    const apiBaseUrl = await listen(server);
    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-human-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Publish handoff warning';
      draft.worklog.summary = 'Warn when requested handoff fails';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--yes', '--open-review'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: apiBaseUrl
        }
      });

      expect(publish.stdout).toContain('Warning: Review URL was not copied to clipboard.');
      expect(publish.stdout).toContain('Warning: Review URL could not be opened automatically.');
      expect(publish.stdout).toContain('Manual review URL:');
      expect(publish.stdout).toContain('  http://localhost:3001/worklogs/worklog_publish_failed_handoff/review');
      expect(publish.stdout).not.toContain('upload.review_url');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
