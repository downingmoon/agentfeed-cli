import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import {
  closeServer,
  drainRequestBody,
  handleCompatibleMetadata,
  listenOnLocalhost,
  parseCliErrorOutput,
  useCollectUploadFailureFixture,
} from './cli-collect-upload-failure-helpers.js';

const fixture = useCollectUploadFailureFixture();

describe('collect JSON upload preflight failure handling', () => {
  it('refuses collect JSON upload before ingest when the ingestion token preflight fails', async () => {
    await fixture.writeSource('export const ok = "json-upload-invalid-token";\n');
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await drainRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
    });
    const port = await listenOnLocalhost(server);
    try {
      const failure = await fixture.runCollectFailure([
        '--json',
        '--upload',
        '--all',
        '--no-save-cursor'
      ], {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_collect_invalid_token',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Ingestion token check failed');
      expect(output.next_actions).toEqual([
        'unset AGENTFEED_TOKEN',
        'agentfeed status',
        'agentfeed login',
        'agentfeed rotate',
        'agentfeed collect --json --upload'
      ]);
      expect(failure?.stderr ?? '').toBe('');
      expect(tokenStatusCount).toBe(1);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await closeServer(server);
    }
  });
});
