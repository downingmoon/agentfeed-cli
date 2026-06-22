import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

type CliFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

type JsonRecord = {
  readonly [key: string]: unknown;
};

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

function parseJsonObject(text: string): JsonRecord {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('expected JSON object');
  }
  return parsed;
}

function stringField(value: JsonRecord, key: string): string | undefined {
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function stringProperty(value: object, key: 'stdout' | 'stderr'): string | undefined {
  if (!(key in value)) return undefined;
  const field = value[key];
  return typeof field === 'string' ? field : undefined;
}

function cliFailure(error: unknown): CliFailure {
  if (typeof error !== 'object' || error === null) return {};
  const stdout = stringProperty(error, 'stdout');
  const stderr = stringProperty(error, 'stderr');
  return {
    ...(stdout === undefined ? {} : { stdout }),
    ...(stderr === undefined ? {} : { stderr })
  };
}

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-rotate-browser-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('rotate browser token replacement', () => {
  it('rotate replaces a saved token through browser-approved session rotation without printing secrets', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_old_secret',
      token_expires_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let sessionVerifier: string | undefined;
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
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
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'rotate', '--no-open'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          AGENTFEED_CI: '0',
          CI: '0',
          GITHUB_ACTIONS: '0',
          GITLAB_CI: '0',
          BUILDKITE: '0',
          CIRCLECI: '0',
          JENKINS_URL: '0',
          TF_BUILD: '0',
          TEAMCITY_VERSION: '0',
          VERCEL: '0',
          NETLIFY: '0'
        }
      });

      expect(stdout).toContain('AgentFeed token rotated after browser approval.');
      expect(stdout).toContain('Previous saved token was revoked.');
      expect(stdout).toContain('AgentFeed token replacement complete');
      expect(stdout).toContain('Saved replacement token.');
      expect(stdout).toContain('Summary');
      expect(stdout).toContain('Credentials: saved');
      expect(stdout).toContain(`API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Token expires at:');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('agentfeed status');
      expect(stdout).toContain('agentfeed share --dry');
      expect(stdout).not.toContain('af_live_old_secret');
      expect(stdout).not.toContain('af_live_new_secret');
      const saved = parseJsonObject(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved).toMatchObject({
        ingestion_token: 'af_live_new_secret',
        token_expires_at: newExpiry,
        user: { id: 'user-1', username: 'downingmoon' }
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
