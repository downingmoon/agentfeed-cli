import { describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  readPublishJsonUploadRequestBody,
} from './cli-publish-json-helpers.js';
import { useShareGuidanceFixture } from './cli-share-guidance-helpers.js';

const fixture = useShareGuidanceFixture();

async function writeCodexShareSession(sessionId: string, model: string, exportName: string): Promise<string> {
  const sessionFile = join(fixture.dir(), '.agentfeed', `${sessionId}.jsonl`);
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd: fixture.dir(), model } }),
    JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
    JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(fixture.dir(), 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(fixture.dir(), 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
  return sessionFile;
}

function shareUploadCompletionServer() {
  return createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
      res.writeHead(404).end();
      return;
    }
    await readPublishJsonUploadRequestBody(req);
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({
      data: {
        id: 'worklog_share_human_upload',
        status: 'needs_review',
        visibility: 'private',
        review_url: 'http://localhost:3001/worklogs/worklog_share_human_upload/review',
        created_at: '2026-06-06T00:00:00.000Z'
      }
    }));
  });
}

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return `http://127.0.0.1:${address.port}/v1`;
}

describe('share CLI human upload completion output', () => {
  it('prints structured upload completion for human-readable share uploads', async () => {
    const server = shareUploadCompletionServer();
    const apiBaseUrl = await listen(server);

    try {
      const sessionFile = await writeCodexShareSession('share-human-upload', 'gpt-share-human', 'shareHumanUpload');
      const { stdout, stderr } = await fixture.runCli([
        'share',
        '--yes',
        '--source',
        'codex',
        '--session-file',
        sessionFile,
        '--all',
        '--no-clipboard',
        '--no-open-review'
      ], {
        AGENTFEED_TOKEN: 'af_live_share_human',
        AGENTFEED_API_BASE_URL: apiBaseUrl,
        AGENTFEED_CI: '1'
      });

      expect(stderr).toBe('');
      expect(stdout).toContain('AgentFeed upload complete');
      expect(stdout).toContain('Worklog uploaded.');
      expect(stdout).toContain('Summary');
      expect(stdout).toMatch(/Draft: draft_/);
      expect(stdout).toContain('Status: needs_review');
      expect(stdout).toContain('Review URL:');
      expect(stdout).toContain('http://localhost:3001/worklogs/worklog_share_human_upload/review');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('Recommended order:');
      expect(stdout).toMatch(/  1\. agentfeed open --id draft_/);
      expect(stdout).toMatch(/  2\. agentfeed preview --id draft_/);
      expect(stdout).not.toContain('Handoff');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
