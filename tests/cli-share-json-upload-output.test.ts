import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readCollectionState } from '../src/config/collection-state.js';
import { draftUploadCredentialBindingHash, draftUploadPayloadHash } from '../src/api/client.js';
import {
  handleShareJsonUploadPreflight,
  readShareJsonUploadRequestBody,
  useShareJsonUploadFixture,
  writeCodexShareSession,
} from './cli-share-json-upload-helpers.js';

const fixture = useShareJsonUploadFixture();

describe('share CLI JSON upload output', () => {
  it('includes the collected draft in uploaded JSON output for smoke verification', async () => {
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayload = await readShareJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_share_json',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_json/review',
          created_at: '2026-05-30T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = join(fixture.dir(), '.agentfeed', 'codex-share.jsonl');
      await writeFile(sessionFile, [
        JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'share-json-session', cwd: fixture.dir(), model: 'gpt-share-json' } }),
        JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 42 } } } }),
        JSON.stringify({ timestamp: '2026-05-30T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
          [join(fixture.dir(), 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = false;\n+export const shared = true;\n' }
        } } })
      ].join('\n') + '\n');
      await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const shared = true;\n');

      const { stdout } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--note',
        'Smoke author note',
        '--all',
        '--no-clipboard'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      const output = JSON.parse(stdout) as {
        draft?: { id?: string; worklog?: { user_note?: string | null; summary?: string; model?: string | null }; upload?: Record<string, unknown> };
        upload?: { id?: string };
      };
      expect(output.upload?.id).toBe('worklog_share_json');
      expect(output.draft?.worklog?.user_note).toBe('Smoke author note');
      expect(output.draft?.worklog?.summary).not.toContain('Smoke author note');
      expect(output.draft?.worklog?.model).toBe('gpt-share-json');
      const savedDraft = JSON.parse(await readFile(join(fixture.dir(), '.agentfeed', 'drafts', `${output.draft?.id}.json`), 'utf8'));
      expect(output.draft?.upload).toEqual(savedDraft.upload);
      expect(output.draft?.upload?.payload_hash).toBe(draftUploadPayloadHash(output.draft as Parameters<typeof draftUploadPayloadHash>[0]));
      expect(output.draft?.upload?.credential_binding_hash).toBe(draftUploadCredentialBindingHash({
        ingestion_token: 'af_live_test_token',
        api_base_url: `http://127.0.0.1:${address.port}/v1`,
        created_at: 'test'
      }));
      expect((ingestPayload?.worklog as { user_note?: string } | undefined)?.user_note).toBe('Smoke author note');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('honors --no-save-cursor for successful JSON share uploads', async () => {
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
          id: 'worklog_share_no_cursor',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_share_no_cursor/review',
          created_at: '2026-05-31T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = await writeCodexShareSession('share-no-save-cursor', 'gpt-no-cursor', 'noSaveCursor');
      const { stdout, stderr } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-save-cursor',
        '--no-clipboard'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stderr).toBe('');
      expect(JSON.parse(stdout)).toMatchObject({
        dry_run: false,
        upload: { review_url: 'http://localhost:3001/worklogs/worklog_share_no_cursor/review' }
      });
      await expect(readCollectionState(fixture.dir())).resolves.toEqual({});
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('redacts reused draft secrets before JSON output and upload', async () => {
    const secret = 'sk-123456789012345678901234';
    let ingestPayload: Record<string, unknown> | null = null;
    const server = createServer(async (req, res) => {
      if (handleShareJsonUploadPreflight(req, res)) return;
      if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
        res.writeHead(404).end();
        return;
      }
      ingestPayload = await readShareJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_redacted_reuse',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_redacted_reuse/review',
          created_at: '2026-05-30T00:00:00.000Z'
        }
      }));
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');

    try {
      const sessionFile = join(fixture.dir(), '.agentfeed', 'codex-reuse.jsonl');
      await writeFile(sessionFile, [
        JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'reuse-session', cwd: fixture.dir(), model: 'gpt-reuse' } }),
        JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
          [join(fixture.dir(), 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = false;\n' }
        } } })
      ].join('\n') + '\n');
      await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\n');

      const collect = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'collect',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--since',
        '2026-05-30T00:00:00.000Z',
        '--until',
        '2026-05-30T01:00:00.000Z',
        '--no-save-cursor'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: { ...process.env, HOME: fixture.home() }
      });
      const draftId = (JSON.parse(collect.stdout) as { id: string }).id;
      const draftPath = join(fixture.dir(), '.agentfeed', 'drafts', `${draftId}.json`);
      const draft = JSON.parse(await readFile(draftPath, 'utf8')) as {
        worklog: { summary: string; model: string | null; metrics: { agent_modes?: string[] | null } };
      };
      draft.worklog.summary = `manual ${secret}`;
      draft.worklog.model = `model-${secret}`;
      draft.worklog.metrics.agent_modes = [`mode-${secret}`];
      await writeFile(draftPath, JSON.stringify(draft, null, 2));

      const { stdout } = await fixture.execFileAsync(process.execPath, [
        fixture.cliPath,
        'share',
        '--json',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--since',
        '2026-05-30T00:00:00.000Z',
        '--until',
        '2026-05-30T01:00:00.000Z',
        '--no-clipboard'
      ], {
        cwd: fixture.dir(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: fixture.home(),
          AGENTFEED_TOKEN: 'af_live_test_token',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stdout).not.toContain(secret);
      expect(JSON.stringify(ingestPayload)).not.toContain(secret);
      const savedDraft = await readFile(draftPath, 'utf8');
      expect(savedDraft).not.toContain(secret);
      const output = JSON.parse(stdout) as {
        reused_existing_draft?: boolean;
        draft?: { worklog?: { summary?: string; model?: string | null; metrics?: { agent_modes?: string[] | null } } };
      };
      expect(output.reused_existing_draft).toBe(true);
      expect(output.draft?.worklog?.summary).toContain('[REDACTED_SECRET]');
      expect(output.draft?.worklog?.model).toBe('model-[REDACTED_SECRET]');
      expect(output.draft?.worklog?.metrics?.agent_modes).toEqual(['mode-[REDACTED_SECRET]']);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});
