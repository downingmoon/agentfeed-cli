import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
import {
  closeServer,
  createFailingBrowserBin,
  handleUploadPreflight,
  listenOnLocalhost,
  readRequestBody,
  useCollectJsonUploadFixture
} from './cli-collect-json-upload-helpers.js';

const fixture = useCollectJsonUploadFixture();

describe('collect CLI command', () => {
  it('uploads before printing JSON when --json and --upload are combined', async () => {
    const dir = fixture.dir();
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload";\n');
    let requestCount = 0;
    let uploadedPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        requestCount += 1;
        uploadedPayload = await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_collect_json_upload',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review',
            created_at: '2026-05-31T00:00:00Z'
          }
        }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
    });
    const port = await listenOnLocalhost(server);
    try {
      const { stdout } = await fixture.runCollect([
        '--json',
        '--upload',
        '--all',
        '--no-save-cursor'
      ], {
        ...process.env,
        HOME: fixture.home(),
        AGENTFEED_TOKEN: 'af_live_collect_json_upload',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });

      const draft = JSON.parse(stdout);
      expect(requestCount).toBe(1);
      expect(uploadedPayload?.worklog).toBeTruthy();
      expect(draft.id).toMatch(/^draft_/);
      expect(draft.worklog).toBeTruthy();
      expect(draft.draft).toBeUndefined();
      expect(draft.draft_id).toBeUndefined();
      expect(draft.upload).toMatchObject({
        uploaded: true,
        worklog_id: 'worklog_collect_json_upload',
        review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review'
      });
      expect(draft.next_actions).toEqual([
        `agentfeed open --id ${draft.id}`,
        `agentfeed preview --id ${draft.id}`
      ]);

      const savedDraft = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8'));
      expect(draft.upload).toEqual(savedDraft.upload);
      expect(savedDraft.upload).toMatchObject({
        uploaded: true,
        worklog_id: 'worklog_collect_json_upload',
        review_url: 'http://localhost:3001/worklogs/worklog_collect_json_upload/review',
        review_base_url: 'http://localhost:3001',
        uploaded_at: '2026-05-31T00:00:00Z'
      });
      expect(draft.upload.payload_hash).toBe(draftUploadPayloadHash(draft));
      expect(draft.upload.credential_binding_hash).toBe(draftUploadCredentialBindingHash({
        ingestion_token: 'af_live_collect_json_upload',
        api_base_url: `http://127.0.0.1:${port}/v1`,
        created_at: 'test'
      }));
    } finally {
      await closeServer(server);
    }
  });

  it('reports requested collect JSON open-review handoff failures in the draft upload payload', async () => {
    const dir = fixture.dir();
    await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = "json-upload-open";\n');
    const server = createServer(async (req, res) => {
      if (handleUploadPreflight(req, res)) return;
      if (req.method === 'POST' && req.url === '/v1/ingest/worklogs') {
        await readRequestBody(req);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'worklog_collect_json_handoff',
            status: 'needs_review',
            visibility: 'private',
            review_url: 'http://localhost:3001/worklogs/worklog_collect_json_handoff/review',
            created_at: '2026-06-01T00:00:00Z'
          }
        }));
        return;
      }
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Not found', details: {} } }));
    });
    const port = await listenOnLocalhost(server);
    const fakeBin = await createFailingBrowserBin();
    try {
      const { stdout, stderr } = await fixture.runCollect([
        '--json',
        '--upload',
        '--open-review',
        '--all',
        '--no-save-cursor'
      ], {
        ...process.env,
        HOME: fixture.home(),
        PATH: `${fakeBin}:${process.env.PATH ?? ''}`,
        AGENTFEED_TOKEN: 'af_live_collect_json_upload',
        AGENTFEED_API_BASE_URL: `http://127.0.0.1:${port}/v1`
      });

      const draft = JSON.parse(stdout);
      expect(stderr).toBe('');
      expect(draft.upload.review_url).toBe('http://localhost:3001/worklogs/worklog_collect_json_handoff/review');
      expect(draft.upload.handoff.browser).toMatchObject({ requested: true, ok: false });
      expect(draft.upload.handoff.browser.warning).toContain('could not be opened');
      expect(draft.upload.handoff.clipboard).toMatchObject({ requested: false, ok: null });
    } finally {
      await rm(fakeBin, { recursive: true, force: true });
      await closeServer(server);
    }
  });
});
