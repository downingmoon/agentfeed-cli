import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

function execFileWithInput(args: string[], input: string, options: Parameters<typeof execFile>[2] = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(process.execPath, [cliPath, ...args], options, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
    child.stdin?.end(input);
  });
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

type CliFailure = {
  readonly stdout?: string;
  readonly stderr?: string;
};

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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-login-token-stdin-failure-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('login token-stdin failure output', () => {
  it('refuses token-stdin login before writing credentials when API metadata is incompatible', async () => {
    const token = 'af_live_incompatible_stdin_secret';
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ data: { service: 'other-api', api_version: 'v1' } }));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
      try {
        await execFileWithInput(
          ['login', '--token-stdin', '--api-base-url', `http://127.0.0.1:${address.port}/v1`],
          `${token}\n`,
          {
            cwd: dir,
            encoding: 'utf8',
            env: {
              ...process.env,
              HOME: home,
              AGENTFEED_TOKEN: '',
              AGENTFEED_CI: '1',
              AGENTFEED_CREDENTIAL_STORE: 'file'
            }
          }
        );
      } catch (error) {
        failure = cliFailure(error);
      }

      expect(failure).toBeTruthy();
      expect(failure?.stderr).toContain('API compatibility check failed');
      expect(failure?.stderr).toContain('before saving credentials');
      expect(failure?.stderr).not.toContain(token);
      expect(failure?.stdout ?? '').toBe('');
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });


  it('refuses token-stdin login before writing credentials when the ingestion token is invalid', async () => {
    const token = 'af_live_invalid_stdin_secret';
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadata()));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        expect(req.headers.authorization).toBe(`Bearer ${token}`);
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: { code: 'INGESTION_TOKEN_INVALID', message: 'Invalid or revoked ingestion token.', details: {} } }));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
      try {
        await execFileWithInput(
          ['login', '--token-stdin', '--api-base-url', `http://127.0.0.1:${address.port}/v1`],
          `${token}\n`,
          {
            cwd: dir,
            encoding: 'utf8',
            env: {
              ...process.env,
              HOME: home,
              AGENTFEED_TOKEN: '',
              AGENTFEED_CI: '1',
              AGENTFEED_CREDENTIAL_STORE: 'file'
            }
          }
        );
      } catch (error) {
        failure = cliFailure(error);
      }

      expect(failure).toBeTruthy();
      expect(failure?.stderr).toContain('Ingestion token check failed');
      expect(failure?.stderr).toContain('before saving credentials');
      expect(failure?.stderr).not.toContain(token);
      expect(failure?.stdout ?? '').toBe('');
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rejects empty token stdin with copyable safe-token guidance', async () => {
    let failure: { stderr?: string; stdout?: string } | undefined;
    try {
      await execFileWithInput(['login', '--token-stdin'], '', {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_CREDENTIAL_STORE: 'file'
        }
      });
    } catch (error) {
      failure = cliFailure(error);
    }

    expect(failure?.stderr).toContain('No token received on stdin.');
    expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(failure?.stderr).toContain('Run: agentfeed login');
    expect(failure?.stdout ?? '').toBe('');
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
