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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-rotate-metadata-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('rotate metadata compatibility failures', () => {
  it('rotate refuses to replace saved credentials when API metadata is incompatible', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_old_incompatible_secret',
      token_expires_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));
    let sessionRequests = 0;
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/ingest/status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            user: { id: 'user-1', username: 'downingmoon' },
            token: {
              id: 'token-old',
              name: 'CLI: old',
              created_at: '2026-05-30T00:00:00Z',
              last_used_at: null,
              expires_at: '2026-06-01T00:00:00Z',
              expires_in_seconds: 3600,
              expiring_soon: true
            }
          }
        }));
        return;
      }
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'agentfeed-api', api_version: 'v0' } }));
        return;
      }
      if (req.url === '/v1/auth/cli/sessions') sessionRequests += 1;
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_SESSION_REQUEST', message: 'Unexpected session request', details: {} } }));
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [cliPath, 'rotate', '--no-open'], {
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
      } catch (error) {
        failure = cliFailure(error);
      }

      expect(failure).toBeTruthy();
      expect(failure?.stderr).toContain('API compatibility check failed');
      expect(failure?.stderr).toContain('before saving credentials');
      expect(failure?.stderr).not.toContain('af_live_old_incompatible_secret');
      expect(sessionRequests).toBe(0);
      const saved = parseJsonObject(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(stringField(saved, 'ingestion_token')).toBe('af_live_old_incompatible_secret');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
