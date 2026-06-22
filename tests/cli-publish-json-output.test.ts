import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  installFakeClipboard,
  readPublishJsonUploadRequestBody,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';

const fixture = usePublishJsonFixture();

describe('publish CLI JSON output', () => {
  it('prints machine-readable publish JSON and copies the review URL only when requested', async () => {
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
          id: 'worklog_publish_json',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_json/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    const fakeBin = await mkdtemp(join(tmpdir(), 'agentfeed-clipboard-bin-'));
    const clipboardLog = await installFakeClipboard(fakeBin);
    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Publish JSON';
      draft.worklog.summary = 'Machine readable publish output';
      await fixture.writeDraftFile(draft);

      const publish = await fixture.execFileAsync(process.execPath, [fixture.cliPath, 'publish', '--id', draft.id, '--json', '--clipboard'], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
          AGENTFEED_TEST_CLIPBOARD_LOG: clipboardLog,
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(publish.stdout) as { draft_id: string; upload: { id: string; review_url: string }; privacy_policy?: { private_review_upload?: string; public_publish_blocked?: boolean; review_required?: boolean }; next_actions?: string[] };
      expect(output.draft_id).toBe(draft.id);
      expect(output.upload.id).toBe('worklog_publish_json');
      expect(output.upload.review_url).toBe('http://localhost:3001/worklogs/worklog_publish_json/review');
      expect(output.next_actions).toEqual([
        `agentfeed open --id ${draft.id}`,
        `agentfeed preview --id ${draft.id}`
      ]);
      expect(output.privacy_policy).toEqual({
        private_review_upload: 'allowed',
        public_publish_blocked: false,
        review_required: false
      });
      await expect(readFile(clipboardLog, 'utf8')).resolves.toBe('http://localhost:3001/worklogs/worklog_publish_json/review');
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});
