import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  closeServer,
  listenOnLocalhost,
  parseCollectErrorOutput,
  readRequestBody,
  useCollectJsonUploadFixture,
} from './cli-collect-json-upload-helpers.js';

const fixture = useCollectJsonUploadFixture();

describe('collect JSON API compatibility handling', () => {
  it('refuses collect JSON upload before token check or ingest when API metadata is incompatible', async () => {
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = "json-upload-incompatible-api";\n');
    let metadataCount = 0;
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'unexpected-api' } }));
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { ok: true } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });
    const port = await listenOnLocalhost(server);

    try {
      const failure = await fixture.runCollectExpectingFailure(['--json', '--upload', '--all', '--no-save-cursor'], {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_collect_incompatible_api',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });
      const output = parseCollectErrorOutput(failure.stdout);
      expect(output.error.message).toContain('API compatibility check failed');
      expect(output.error.message).toContain('before uploading drafts');
      expect(output.next_actions).toEqual(['agentfeed doctor', 'agentfeed status', 'agentfeed collect --json --upload']);
      expect(failure.stdout ?? '').not.toContain('af_live_collect_incompatible_api');
      expect(failure.stderr ?? '').toBe('');
      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(0);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await closeServer(server);
    }
  });
});
