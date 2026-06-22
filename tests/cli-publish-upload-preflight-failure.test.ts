import { describe, expect, it } from 'vitest';
import {
  startUploadPreflightFailureServer,
  useUploadPreflightFailureFixture,
  writeCompatibleMetadataResponse,
  writeInvalidTokenResponse,
} from './cli-upload-preflight-failure-helpers.js';

const fixture = useUploadPreflightFailureFixture();

describe('agentfeed publish upload preflight failures', () => {
  it('refuses direct publish before ingest when the ingestion token preflight fails', async () => {
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
      const draft = fixture.createDraft();
      draft.worklog.title = 'Invalid token publish';
      await fixture.writeDraftFile(draft);
      const env = {
        AGENTFEED_TOKEN: 'af_live_invalid_token',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
      };

      const humanFailure = await fixture.runPublishAttempt(['--id', draft.id, '--yes'], env);
      expect(humanFailure.stdout).toBe('');
      expect(humanFailure.stderr).toContain('Ingestion token check failed');
      expect(humanFailure.stderr).toContain('HTTP 401: INGESTION_TOKEN_INVALID: Invalid ingestion token');
      expect(humanFailure.stderr).toContain('Fix first');
      expect(humanFailure.stderr).toContain('Run: unset AGENTFEED_TOKEN');
      expect(humanFailure.stderr).toContain('Run: agentfeed status');
      expect(humanFailure.stderr).toContain('Run: agentfeed login');
      expect(humanFailure.stderr).toContain('Run: agentfeed rotate');
      expect(humanFailure.stderr).toContain('Then retry');
      expect(humanFailure.stderr).toContain(`Run: agentfeed publish --id ${draft.id} --yes`);

      const jsonFailure = await fixture.runPublishAttempt(['--id', draft.id, '--json'], env);
      const jsonOutput = JSON.parse(jsonFailure.stdout) as { error?: { message?: string }; next_actions?: string[] };
      expect(jsonFailure.stderr).toBe('');
      expect(jsonOutput.error?.message).toContain('Ingestion token check failed');
      expect(jsonOutput.error?.message).toContain('HTTP 401: INGESTION_TOKEN_INVALID: Invalid ingestion token');
      expect(jsonOutput.next_actions).toEqual([
        'unset AGENTFEED_TOKEN',
        'agentfeed status',
        'agentfeed login',
        'agentfeed rotate',
        `agentfeed publish --id ${draft.id} --yes`,
      ]);
      expect(tokenStatusCount).toBe(2);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await server.close();
    }
  });

  it('refuses direct publish before token check or ingest when API metadata is incompatible', async () => {
    let metadataCount = 0;
    let tokenStatusCount = 0;
    let ingestRequestCount = 0;
    const server = await startUploadPreflightFailureServer((req, res) => {
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
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const draft = fixture.createDraft();
      draft.worklog.title = 'Incompatible API publish';
      await fixture.writeDraftFile(draft);

      const failure = await fixture.runPublishAttempt(['--id', draft.id, '--yes'], {
        AGENTFEED_TOKEN: 'af_live_publish_incompatible_api',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
      });

      expect(failure.stdout).toBe('');
      expect(failure.stderr).toContain('API compatibility check failed');
      expect(failure.stderr).toContain('before uploading drafts');
      expect(failure.stderr).toContain('Fix first');
      expect(failure.stderr).toContain('Run: agentfeed doctor');
      expect(failure.stderr).toContain('Run: agentfeed status');
      expect(failure.stderr).toContain('Then retry');
      expect(failure.stderr).toContain(`Run: agentfeed publish --id ${draft.id} --yes`);
      expect(failure.stderr).not.toContain('af_live_publish_incompatible_api');
      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(0);
      expect(ingestRequestCount).toBe(0);
    } finally {
      await server.close();
    }
  });
});
