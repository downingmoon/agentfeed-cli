import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  installFakeBrowserOpener,
  installFakeClipboard,
  installFailingReviewUrlHandoff,
  readPublishJsonUploadRequestBody,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';

const fixture = usePublishJsonFixture();

describe('publish CLI JSON review URL handoff', () => {
  it('does not copy or open review URLs for publish JSON by default', async () => {
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
          id: 'worklog_publish_json_default_side_effects',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json_default_side_effects/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-json-default-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    const browserLog = await installFakeBrowserOpener(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Publish JSON default side effects';
      draft.worklog.summary = 'Machine-readable publish must be quiet unless side effects are explicit.';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--json'], {
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

      const output = JSON.parse(publish.stdout) as {
        draft_id?: string;
        upload?: { id?: string; review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean | null };
          browser?: { requested?: boolean; ok?: boolean | null };
        };
        next_actions?: string[];
      };
      expect(output.upload?.id).toBe('worklog_publish_json_default_side_effects');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json_default_side_effects/review');
      expect(output.next_actions).toEqual([
        `agentfeed open --id ${output.draft_id}`,
        `agentfeed preview --id ${output.draft_id}`
      ]);
      expect(output.handoff?.clipboard).toMatchObject({ requested: false, ok: null });
      expect(output.handoff?.browser).toMatchObject({ requested: false, ok: null });
      await expect(readFile(clipboardLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
      await expect(readFile(browserLog, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('reports requested publish JSON review URL handoff failures inside the JSON payload', async () => {
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
          id: 'worklog_publish_json_failed_handoff',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json_failed_handoff/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-publish-json-failed-handoff-bin-'));
    await installFailingReviewUrlHandoff(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Publish JSON failed handoff';
      draft.worklog.summary = 'Machine-readable publish must report requested handoff failures.';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'publish',
        '--id',
        draft.id,
        '--json',
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

      const output = JSON.parse(publish.stdout) as {
        draft_id?: string;
        upload?: { id?: string; review_url?: string };
        handoff?: {
          clipboard?: { requested?: boolean; ok?: boolean; warning?: string };
          browser?: { requested?: boolean; ok?: boolean; warning?: string };
        };
      };
      expect(publish.stderr).toBe('');
      expect(output.upload?.id).toBe('worklog_publish_json_failed_handoff');
      expect(output.upload?.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json_failed_handoff/review');
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
