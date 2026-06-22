import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  handleShareJsonUploadPreflight,
  installFailingReviewUrlHandoff,
  readShareJsonUploadRequestBody,
  useShareJsonUploadFixture,
  writeCodexShareSession,
} from './cli-share-json-upload-helpers.js';

const fixture = useShareJsonUploadFixture();

describe('share CLI JSON review URL handoff failures', () => {
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
