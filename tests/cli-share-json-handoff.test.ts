import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handleShareJsonUploadPreflight,
  installFakeBrowserOpener,
  installFakeClipboard,
  installFailingReviewUrlHandoff,
  readShareJsonUploadRequestBody,
  useShareJsonUploadFixture,
  writeCodexShareSession,
} from './cli-share-json-upload-helpers.js';

const fixture = useShareJsonUploadFixture();

describe('share CLI JSON review URL handoff', () => {
  it('does not copy or open review URLs for share JSON by default', async () => {
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readShareJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_json_default_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_default_side_effects/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-default-side-effects', 'gpt-share-json-default', 'jsonDefaultSideEffects');
      const { stdout } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as { draft_id?: string; draft?: { id?: string }; upload?: { id?: string; review_url?: string }; next_actions?: string[] };
      const draftId = output.draft_id ?? output.draft?.id;
      expect(output.upload?.id).toBe('worklog_share_json_default_side_effects');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_default_side_effects/review');
      expect(output.next_actions).toEqual([
        `agentfeed open --id ${draftId}`,
        `agentfeed preview --id ${draftId}`
      ]);
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('copies and opens review URLs for share JSON only when explicitly requested', async () => {
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readShareJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_json_requested_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-side-effects-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-requested-side-effects', 'gpt-share-json-requested', 'jsonRequestedSideEffects');
      const { stdout } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--since',
        '2026-05-31T00:00:00Z',
        '--until',
        '2026-05-31T01:00:00Z',
        '--clipboard',
        '--open-review'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TEST_BROWSER_LOG: browserLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as { upload?: { review_url?: string } };
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review');
      await expect(readFile(clipboardLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review');
      await expect(readFile(browserLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_share_json_requested_side_effects/review\n');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reports requested share JSON review URL handoff failures inside the JSON payload', async () => {
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      await readShareJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_json_failed_handoff',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json_failed_handoff/review',
          created_at: '2026-06-01T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-json-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);

    try {
      const sessionFile = await writeCodexShareSession('share-json-failed-handoff', 'gpt-share-json-handoff', 'jsonFailedHandoff');
      const { stdout, stderr } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--clipboard',
        '--open-review'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as {
        upload?: { review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean; warning?: string };
          browser?: { requested?: boolean; ok?: boolean; warning?: string };
        };
      };
      expect(stderr).toBe('');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_share_json_failed_handoff/review');
      expect(output.handoff?.clipboard).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.clipboard?.warning).toContain('not copied');
      expect(output.handoff?.browser).toMatchObject({ requested: true, ok: false });
      expect(output.handoff?.browser?.warning).toContain('could not be opened');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});
