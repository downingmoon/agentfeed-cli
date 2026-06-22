import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  handleShareJsonUploadPreflight,
  readShareJsonUploadRequestBody,
  useShareJsonUploadFixture,
} from './cli-share-json-upload-helpers.js';

const fixture = useShareJsonUploadFixture();

describe('share CLI JSON upload redaction', () => {
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
