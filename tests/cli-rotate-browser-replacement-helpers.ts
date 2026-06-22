import { createServer } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { expect } from 'vitest';

type JsonRecord = {
  readonly [key: string]: unknown;
};

type RotateBrowserReplacementServer = {
  readonly apiBaseUrl: string;
  readonly newExpiry: string;
  readonly close: () => Promise<void>;
};

export async function prepareSavedRotateCredentials(home: string): Promise<void> {
  await mkdir(join(home, '.agentfeed'), { recursive: true });
  await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
    api_base_url: 'http://127.0.0.1:9/v1',
    ingestion_token: 'af_live_old_secret',
    token_expires_at: '2026-06-01T00:00:00Z',
    created_at: '2026-05-30T00:00:00Z'
  }));
}

export function parseJsonObject(text: string): JsonRecord {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected JSON object');
  }
  return parsed;
}

export async function startRotateBrowserReplacementServer(): Promise<RotateBrowserReplacementServer> {
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  let sessionVerifier: string | undefined;
  const server = createServer((req, res) => {
    if (req.url === '/v1/metadata') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(compatibleMetadata()));
      return;
    }
    if (req.url === '/v1/ingest/status') {
      const authorization = req.headers.authorization;
      expect(['Bearer af_live_old_secret', 'Bearer af_live_new_secret']).toContain(authorization);
      const oldToken = authorization === 'Bearer af_live_old_secret';
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        data: {
          ok: true,
          user: { id: 'user-1', username: 'downingmoon' },
          token: {
            id: oldToken ? 'token-old' : 'token-new',
            name: oldToken ? 'CLI: old' : 'CLI: new',
            created_at: oldToken ? '2026-05-30T00:00:00Z' : '2026-05-30T00:01:00Z',
            last_used_at: null,
            expires_at: oldToken ? '2026-06-01T00:00:00Z' : newExpiry,
            expires_in_seconds: oldToken ? 3600 : 2_592_000,
            expiring_soon: oldToken,
          }
        }
      }));
      return;
    }
    if (req.url === '/v1/auth/cli/sessions' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const body = parseJsonObject(Buffer.concat(chunks).toString('utf8'));
        const verifier = stringField(body, 'verifier');
        expect(verifier).toMatch(/^[a-f0-9]{64}$/);
        expect(stringField(body, 'replace_token_id')).toBe('token-old');
        sessionVerifier = verifier;
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            session_id: 'session-rotate',
            authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-rotate',
            user_code: '123-456',
            expires_at: '2026-05-30T00:05:00Z',
            poll_interval_seconds: 1
          }
        }));
      });
      return;
    }
    if (req.url === '/v1/auth/cli/sessions/session-rotate/exchange' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(Buffer.from(chunk)));
      req.on('end', () => {
        const body = parseJsonObject(Buffer.concat(chunks).toString('utf8'));
        expect(stringField(body, 'verifier')).toBe(sessionVerifier);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            token: 'af_live_new_secret',
            token_id: 'token-new',
            token_expires_at: newExpiry,
            rotated_from: 'token-old',
            rotated_at: '2026-05-30T00:01:00Z',
            user: { id: 'user-1', username: 'downingmoon', display_name: 'Downing Moon' }
          }
        }));
      });
      return;
    }
    res.writeHead(404).end();
  });
  await listen(server);
  const address = server.address();
  const port = boundPort(address);
  return {
    apiBaseUrl: `http://127.0.0.1:${port}/v1`,
    newExpiry,
    close: () => close(server)
  };
}

function compatibleMetadata() {
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

function stringField(value: JsonRecord, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function listen(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
}

function close(server: ReturnType<typeof createServer>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function boundPort(address: AddressInfo | string | null): number {
  if (!address || typeof address === 'string') throw new Error('test server did not bind');
  return address.port;
}
