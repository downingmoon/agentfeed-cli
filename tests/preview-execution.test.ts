import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_API_BASE_URL } from '../src/config/defaults.js';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { runPreviewCommand } from '../src/cli/preview-execution.js';

const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';
let dir: string;
let originalToken: string | undefined;
let originalApiBaseUrl: string | undefined;
let originalAgentFeedHome: string | undefined;

function compatibleMetadataPayload() {
  return {
    data: {
      service: 'agentfeed-api',
      api_version: 'v1',
      backend_version: '0.1.0',
      contract_version: '2026-06-03',
      review_base_url: 'http://localhost:3001',
      supported_clients: {
        cli: { min_version: '0.2.0', contract_version: '2026-06-03' },
        frontend: { min_version: '0.1.0', contract_version: '2026-06-03' }
      }
    }
  };
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-preview-execution-'));
  await initProject({ cwd: dir, noGitCheck: true });
  originalToken = process.env.AGENTFEED_TOKEN;
  originalApiBaseUrl = process.env.AGENTFEED_API_BASE_URL;
  originalAgentFeedHome = process.env.AGENTFEED_HOME;
  delete process.env.AGENTFEED_TOKEN;
  delete process.env.AGENTFEED_API_BASE_URL;
  process.env.AGENTFEED_HOME = join(dir, 'home');
});

afterEach(async () => {
  if (originalToken === undefined) delete process.env.AGENTFEED_TOKEN;
  else process.env.AGENTFEED_TOKEN = originalToken;
  if (originalApiBaseUrl === undefined) delete process.env.AGENTFEED_API_BASE_URL;
  else process.env.AGENTFEED_API_BASE_URL = originalApiBaseUrl;
  if (originalAgentFeedHome === undefined) delete process.env.AGENTFEED_HOME;
  else process.env.AGENTFEED_HOME = originalAgentFeedHome;
  await rm(dir, { recursive: true, force: true });
});

describe('preview execution helper', () => {
  it('sanitizes and persists local draft preview fields before returning the draft', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = `Preview with ${secret}`;
    await writeDraft(dir, draft);

    const result = await runPreviewCommand({ cwd: dir, id: draft.id, remote: false });
    const saved = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8')) as { worklog?: { summary?: string }; privacy_scan?: { status?: string } };

    expect(result.kind).toBe('local');
    if (result.kind === 'local') expect(result.draft.worklog.summary).toBe('Preview with [REDACTED_SECRET]');
    expect(saved.worklog?.summary).toBe('Preview with [REDACTED_SECRET]');
    expect(saved.privacy_scan?.status).toBe('danger');
  });

  it('requires credentials before remote preview after local sanitization', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.title = 'Remote preview needs login';
    await writeDraft(dir, draft);
    process.env.AGENTFEED_API_BASE_URL = DEFAULT_API_BASE_URL;

    await expect(runPreviewCommand({ cwd: dir, id: draft.id, remote: true })).rejects.toThrow('AgentFeed token is missing.');
  });

  it('runs remote preview through compatibility preflight with sanitized draft payload', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.worklog.summary = `Remote preview with ${secret}`;
    await writeDraft(dir, draft);
    let metadataCount = 0;
    let previewCount = 0;
    let previewBody = '';
    const server = createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/v1/metadata') {
        metadataCount += 1;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadataPayload()));
        return;
      }
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs/preview') {
        previewCount += 1;
        expect(req.headers.authorization).toBe('Bearer af_live_preview_execution');
        req.on('data', (chunk) => { previewBody += String(chunk); });
        req.on('end', () => {
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            data: {
              valid: true,
              preview: { title: 'Remote preview', summary: 'Remote summary', user_note: null, model: null, metrics_row: '0 files' },
              warnings: []
            }
          }));
        });
        return;
      }
      res.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('preview test server did not bind to TCP');

    try {
      process.env.AGENTFEED_TOKEN = 'af_live_preview_execution';
      process.env.AGENTFEED_API_BASE_URL = `http://127.0.0.1:${address.port}/v1`;

      const result = await runPreviewCommand({ cwd: dir, id: draft.id, remote: true });

      expect(result.kind).toBe('remote');
      if (result.kind === 'remote') {
        expect(result.remote.valid).toBe(true);
        expect(result.remote.preview.summary).toBe('Remote summary');
        expect(result.draft.worklog.summary).toBe('Remote preview with [REDACTED_SECRET]');
      }
      expect(metadataCount).toBe(1);
      expect(previewCount).toBe(1);
      expect(previewBody).toContain('[REDACTED_SECRET]');
      expect(previewBody).not.toContain(secret);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
