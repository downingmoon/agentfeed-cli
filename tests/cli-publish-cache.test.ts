import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  cachedUploadForPublishCache,
  readPublishCacheRequestBody,
  startPublishCacheServer,
  startPublishUploadPreflightServer,
  usePublishCacheFixture,
  writePublishCacheCompatibleMetadataResponse,
} from './cli-publish-cache-helpers.js';

const fixture = usePublishCacheFixture();

describe('agentfeed publish cached upload reuse', () => {
  it('still requires confirmation for a cached upload from a different credential binding', async () => {
    let requestCount = 0;
    const server = await startPublishCacheServer((_req, res) => {
      requestCount += 1;
      res.writeHead(500).end();
    });

    try {
      const draft = fixture.createDraft();
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_other_binding',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_other_binding/review',
        token: 'old-token',
        apiBaseUrl: server.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      const publish = await fixture.runPublish(['--id', draft.id], {
        AGENTFEED_TOKEN: 'new-token',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
        AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
        CI: '1',
      });

      expect(publish.stdout).toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('No data was uploaded to AgentFeed.');
      expect(publish.stdout).toContain('Saved private review cache cannot be reused: saved upload was created with a different token or user binding.');
      expect(requestCount).toBe(0);
    } finally {
      await server.close();
    }
  });

  it('checks API compatibility before uploading when cached upload binding is not reusable', async () => {
    let metadataCount = 0;
    let ingestCount = 0;
    const server = await startPublishCacheServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'unexpected-api' } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestCount += 1;
        await readPublishCacheRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_should_not_upload',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_should_not_upload/review',
            created_at: '2026-05-31T00:00:00.000Z',
          },
        }));
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const draft = fixture.createDraft();
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_old_api',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_old_api/review',
        token: 'old-token',
        apiBaseUrl: server.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      await expect(fixture.runPublishAttempt(['--id', draft.id, '--yes'], {
        AGENTFEED_TOKEN: 'new-token',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
        CI: '1',
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('API compatibility check failed'),
      });

      expect(metadataCount).toBe(1);
      expect(ingestCount).toBe(0);
    } finally {
      await server.close();
    }
  });

  it('checks API compatibility and token status before reusing a cached upload', async () => {
    let metadataCount = 0;
    let tokenStatusCount = 0;
    let ingestCount = 0;
    const server = await startPublishCacheServer(async (req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        writePublishCacheCompatibleMetadataResponse(res);
        return;
      }
      if (req.method === 'GET' && req.url === '/v1/ingest/status') {
        tokenStatusCount += 1;
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid ingestion token', details: {} } }));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        ingestCount += 1;
        await readPublishCacheRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: {} }));
        return;
      }
      res.writeHead(404).end();
    });

    try {
      const draft = fixture.createDraft();
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_reusable_token_check',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_reusable_token_check/review',
        apiBaseUrl: server.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      await expect(fixture.runPublishAttempt(['--id', draft.id], {
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: server.apiBaseUrl,
        AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
        CI: '1',
      })).rejects.toMatchObject({
        stderr: expect.stringContaining('Ingestion token check failed'),
      });

      expect(metadataCount).toBe(1);
      expect(tokenStatusCount).toBe(1);
      expect(ingestCount).toBe(0);
    } finally {
      await server.close();
    }
  });

  it('skips forced confirmation only when the cached upload is reusable for the current payload and credentials', async () => {
    const preflight = await startPublishUploadPreflightServer();

    try {
      const draft = fixture.createDraft();
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_reusable_cli_cache',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_reusable_cli_cache/review',
        apiBaseUrl: preflight.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      const publish = await fixture.runPublish(['--id', draft.id], {
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
        AGENTFEED_FORCE_UPLOAD_CONFIRMATION: '1',
        CI: '1',
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).not.toContain('Upload confirmation required.');
      expect(publish.stdout).toContain('http://localhost:3001/worklogs/worklog_reusable_cli_cache/review');
    } finally {
      await preflight.close();
    }
  });

  it('makes direct publish privacy policy clear for high-severity private review drafts', async () => {
    const preflight = await startPublishUploadPreflightServer();

    try {
      const secret = 'sk-123456789012345678901234';
      const draft = fixture.createDraft();
      draft.worklog.summary = `Manual edit contains ${secret}`;
      draft.upload = cachedUploadForPublishCache({
        draft,
        worklogId: 'worklog_privacy_policy',
        reviewUrl: 'http://localhost:3001/worklogs/worklog_privacy_policy/review',
        apiBaseUrl: preflight.apiBaseUrl,
      });
      await fixture.writeDraftFile(draft);

      const publish = await fixture.runPublish(['--id', draft.id], {
        AGENTFEED_TOKEN: 'af_live_test_token',
        AGENTFEED_API_BASE_URL: preflight.apiBaseUrl,
        CI: '1',
      });

      expect(publish.stdout).toContain('Private review draft already uploaded; reusing existing review URL.');
      expect(publish.stdout).toContain('Privacy review: required before public publishing.');
      expect(publish.stdout).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');
      expect(publish.stdout).toContain('Private review upload is allowed so you can resolve findings in the web review.');
      const saved = await readFile(join(fixture.dir(), '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8');
      expect(saved).not.toContain(secret);
    } finally {
      await preflight.close();
    }
  });
});
