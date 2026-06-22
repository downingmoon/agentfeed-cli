import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  readPublishJsonUploadRequestBody,
  spawnAgentFeedJson,
  usePublishJsonFixture,
} from './cli-publish-json-helpers.js';

const fixture = usePublishJsonFixture();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(text: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error('expected JSON object');
  return parsed;
}

function uploadId(output: Record<string, unknown>): unknown {
  const upload = output.upload;
  if (!isRecord(upload)) return undefined;
  return upload.id;
}

function uploadReusedExisting(output: Record<string, unknown>): unknown {
  const upload = output.upload;
  if (!isRecord(upload)) return undefined;
  return upload.reused_existing;
}

describe('publish CLI JSON locking', () => {
  it('serializes two publish processes for the same draft and issues one ingest request', async () => {
    const ingestPayloads: Record<string, unknown>[] = [];
    const server = createServer(async (req, res) => {
      if (handlePublishJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayloads.push(await readPublishJsonUploadRequestBody(req));
      await new Promise(resolve => setTimeout(resolve, 250));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_two_process',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_two_process/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Two process publish';
      draft.worklog.summary = 'Only one process should upload this draft.';
      await fixture.writeDraftFile(draft);

      const env = {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
        CI: '1',
        AGENTFEED_CI: '1'
      };
      const runs = await Promise.all([
        spawnAgentFeedJson({ args: ['publish', '--id', draft.id, '--json', '--no-clipboard'], cwd: fixture.dir(), env }),
        spawnAgentFeedJson({ args: ['publish', '--id', draft.id, '--json', '--no-clipboard'], cwd: fixture.dir(), env })
      ]);

      const outputs = runs.map(run => parseJsonObject(run.stdout));
      expect(ingestPayloads).toHaveLength(1);
      expect(outputs.map(output => output.draft_id)).toEqual([draft.id, draft.id]);
      expect(outputs.map(uploadId)).toEqual(['worklog_two_process', 'worklog_two_process']);
      expect(outputs.some(output => uploadReusedExisting(output) === true)).toBe(true);
      const saved = parseJsonObject(await readFile(join(fixture.dir(), '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
      const upload = saved.upload;
      expect(upload).toMatchObject({
        worklog_id: 'worklog_two_process',
        review_url: 'http://localhost:3001/worklogs/worklog_two_process/review'
      });
      await expect(readFile(join(fixture.dir(), '.agentfeed', 'drafts', `${draft.id}.json.upload.lock`), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
