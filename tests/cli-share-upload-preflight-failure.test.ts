import { describe, expect, it } from 'vitest';
import {
  startUploadPreflightFailureServer,
  useUploadPreflightFailureFixture,
  writeCompatibleMetadataResponse,
  writeIncompatibleContractMetadataResponse,
  writeInvalidTokenResponse,
} from './cli-upload-preflight-failure-helpers.js';

const fixture = useUploadPreflightFailureFixture();

describe('agentfeed share upload preflight failures', () => {
  it('refuses share upload before ingest when API metadata is incompatible', async () => {
    let ingestRequestCount = 0;
    const server = await startUploadPreflightFailureServer((req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        writeIncompatibleContractMetadataResponse(res);
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const sessionFile = await fixture.writeCodexShareSession('share-incompatible-api', 'gpt-incompatible-api', 'incompatibleApi');
      const failure = await fixture.spawnJsonAttempt([
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard',
      ], {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_incompatible_api',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
      });

      const output = JSON.parse(failure.stdout) as { error: { message: string }; next_actions: string[] };
      expect(output.error.message).toContain('API compatibility check failed');
      expect(output.error.message).toContain('HTTP 200: AgentFeed API metadata response data is invalid.');
      expect(output.next_actions).toEqual(['agentfeed doctor', 'agentfeed status', 'agentfeed share --json --yes']);
      expect(failure.stderr).toBe('');
      expect(ingestRequestCount).toBe(0);
    } finally {
      await server.close();
    }
  });

  it('refuses share upload before ingest when the ingestion token preflight fails', async () => {
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = await startUploadPreflightFailureServer((req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        writeCompatibleMetadataResponse(res);
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        writeInvalidTokenResponse(res);
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestRequestCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const sessionFile = await fixture.writeCodexShareSession('share-invalid-token', 'gpt-invalid-token', 'invalidToken');
      const failure = await fixture.spawnJsonAttempt([
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard',
      ], {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_invalid_token',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
      });

      const output = JSON.parse(failure.stdout) as { error: { message: string }; next_actions?: string[] };
      expect(output.error.message).toContain('Ingestion token check failed');
      expect(output.error.message).toContain('HTTP 401: INGESTION_TOKEN_INVALID: Invalid ingestion token');
      expect(output.next_actions).toEqual([
        'unset AGENTFEED_TOKEN',
        'agentfeed status',
        'agentfeed login',
        'agentfeed rotate',
        'agentfeed share --json --yes',
      ]);
      expect(failure.stderr).toBe('');
      expect(tokenStatusCount).toBe(1);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await server.close();
    }
  });
});
