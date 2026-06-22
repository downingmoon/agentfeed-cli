import { createServer, type Server } from 'node:http';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { draftUploadCredentialBindingHash } from '../src/api/client.js';
import type { LocalDraft } from '../src/types.js';
import {
  handlePublishJsonUploadPreflight,
  readPublishJsonUploadRequestBody,
  type PublishJsonFixture
} from './cli-publish-json-helpers.js';

export type CachedUploadBindingOptions = {
  readonly token?: string;
  readonly apiBaseUrl?: string;
};

export type PublishServerOptions = {
  readonly id: string;
  readonly reviewUrl: string;
  readonly createdAt: string;
};

export function parseDraftId(text: string): string {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed) || typeof parsed.id !== 'string') throw new Error('collect output must include a draft id');
  return parsed.id;
}

export function cachedUploadBindingForEnv(options: CachedUploadBindingOptions = {}) {
  const credentials = {
    ingestion_token: options.token ?? 'af_live_test_token',
    api_base_url: options.apiBaseUrl ?? 'https://api.agentfeed.dev/v1',
    created_at: 'now'
  };
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: null,
    user_id: null
  };
}

export async function startUploadPreflightServer(): Promise<{ readonly apiBaseUrl: string; readonly close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    if (handlePublishJsonUploadPreflight(req, res)) return;
    res.writeHead(404).end();
  });
  const apiBaseUrl = await listen(server);
  return {
    apiBaseUrl,
    close: () => closeServer(server)
  };
}

export async function writeOpenReviewSession(fixture: PublishJsonFixture): Promise<string> {
  const sessionFile = join(fixture.dir(), '.agentfeed', 'codex-open-review.jsonl');
  await writeFile(sessionFile, [
    JSON.stringify({ timestamp: '2026-05-30T00:00:00Z', type: 'session_meta', payload: { id: 'open-review-session', cwd: fixture.dir(), model: 'gpt-open-review' } }),
    JSON.stringify({ timestamp: '2026-05-30T00:01:00Z', type: 'response_item', payload: { type: 'patch_apply_end', status: 'completed', changes: {
      [join(fixture.dir(), 'src', 'api.ts')]: { type: 'modify', unified_diff: '--- a/src/api.ts\n+++ b/src/api.ts\n@@\n-export const ok = true;\n+export const ok = true;\n+export const autoOpen = true;\n' }
    } } })
  ].join('\n') + '\n');
  await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = true;\nexport const autoOpen = true;\n');
  return sessionFile;
}

export function publishServer(options: PublishServerOptions): Server {
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
        id: options.id,
        status: 'needs_review',
        visibility: 'private',
        review_url: options.reviewUrl,
        created_at: options.createdAt
      }
    }));
  });
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

export function assignCachedUpload(draft: LocalDraft, options: {
  readonly worklogId: string;
  readonly reviewUrl: string;
  readonly uploadedAt: string;
  readonly payloadHash: string;
  readonly apiBaseUrl: string;
}): void {
  draft.upload = {
    uploaded: true,
    worklog_id: options.worklogId,
    review_url: options.reviewUrl,
    uploaded_at: options.uploadedAt,
    payload_hash: options.payloadHash,
    ...cachedUploadBindingForEnv({ apiBaseUrl: options.apiBaseUrl })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
