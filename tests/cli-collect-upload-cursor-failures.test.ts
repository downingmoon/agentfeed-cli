import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readCollectionState } from '../src/config/collection-state.js';
import {
  closeServer,
  drainRequestBody,
  handleCompatibleMetadata,
  handleUploadPreflight,
  listenOnLocalhost,
  parseCliErrorOutput,
  useCollectUploadFailureFixture,
} from './cli-collect-upload-failure-helpers.js';

const fixture = useCollectUploadFailureFixture();

const uploadWindowArgs = [
  '--json',
  '--upload',
  '--since',
  '2026-05-20T01:00:00Z',
  '--until',
  '2026-05-20T02:00:00Z'
] as const;

describe('collect JSON upload cursor failure handling', () => {
  it('keeps the collection cursor unchanged when collect JSON upload preflight fails', async () => {
    await fixture.writeSource('export const ok = "json-upload-cursor-invalid-token";\n');
    const server = createServer(async (req, res) => {
      if (handleCompatibleMetadata(req, res)) return;
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
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
      const failure = await fixture.runCollectFailure(uploadWindowArgs, {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_collect_cursor_invalid_token',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Ingestion token check failed');
      expect(failure?.stderr ?? '').toBe('');
      await expect(readCollectionState(fixture.dir())).resolves.toEqual({});
    } finally {
      await closeServer(server);
    }
  });

  it('keeps the collection cursor unchanged when collect JSON ingest upload fails', async () => {
    await fixture.writeSource('export const ok = "json-upload-cursor-ingest-fails";\n');
    let ingestRequestCount = 0;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        await drainRequestBody(req);
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'SERVER_ERROR', message: 'boom', details: {} } }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
    });
    const port = await listenOnLocalhost(server);
    try {
      const failure = await fixture.runCollectFailure(uploadWindowArgs, {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_collect_cursor_upload_fails',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });
      const output = parseCliErrorOutput(failure?.stdout);
      expect(output.error.message).toContain('Server error. Local draft was kept.');
      expect(failure?.stderr ?? '').toBe('');
      expect(ingestRequestCount).toBeGreaterThan(0);
      await expect(readCollectionState(fixture.dir())).resolves.toEqual({});
    } finally {
      await closeServer(server);
    }
  });
});
