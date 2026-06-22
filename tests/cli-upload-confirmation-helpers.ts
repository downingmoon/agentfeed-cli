import { createServer, type Server } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  handlePublishJsonUploadPreflight,
  readPublishJsonUploadRequestBody,
} from './cli-publish-json-helpers.js';

export type UploadCounterServer = {
  readonly count: () => number;
  readonly server: Server;
};

export async function writeCodexShareSession(dir: string, sessionId: string, model: string, exportName: string): Promise<string> {
  const sessionFile = join(dir, '.agentfeed', `${sessionId}.jsonl`);
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-31T00:00:00Z', type: 'session_meta', payload: { id: sessionId, cwd: dir, model } }),
    JSON.stringify({ timestamp: '2026-05-31T00:01:00Z', type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { total_tokens: 31 } } } }),
    JSON.stringify({ timestamp: '2026-05-31T00:02:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(dir, 'src', 'api.ts')]: { type: 'modify', unified_diff: `--- a/src/api.ts\n+++ b/src/api.ts\n@@\n export const ok = true;\n+export const ${exportName} = true;\n` }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(dir, 'src', 'api.ts'), `export const ok = true;\nexport const ${exportName} = true;\n`);
  return sessionFile;
}

export function uploadCountingServer(options: { readonly success?: boolean } = {}): UploadCounterServer {
  let ingestRequestCount = 0;
  const server = createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    if (req.method !== 'POST' || req.url !== '/v1/ingest/worklogs') {
      res.writeHead(404).end();
      return;
    }
    ingestRequestCount += 1;
    if (options.success === true) {
      await readPublishJsonUploadRequestBody(req);
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          id: 'worklog_publish_confirmed',
          status: 'needs_review',
          visibility: 'private',
          review_url: 'http://localhost:3001/worklogs/worklog_publish_confirmed/review',
          created_at: '2026-06-03T00:00:00.000Z'
        }
      }));
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: {} }));
  });
  return {
    count: () => ingestRequestCount,
    server
  };
}

export async function listen(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to a TCP port');
  return `http://127.0.0.1:${address.port}/v1`;
}

export async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
