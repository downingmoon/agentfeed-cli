import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-login-ci-fail-fast-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('login CI fail-fast output', () => {
  it('login fails fast in CI with token remediation and no browser session request', async () => {
    let requestCount = 0;
    const server = await import('node:http').then(({ createServer }) => createServer((_req, res) => {
      requestCount += 1;
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_BROWSER_SESSION_REQUEST', message: 'Unexpected browser session request', details: {} } }));
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    const startedAt = Date.now();

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
      try {
        await execFileAsync(process.execPath, [cliPath, 'login', '--no-open', '--api-base-url', `http://127.0.0.1:${address.port}/v1`], {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            HOME: home,
            AGENTFEED_TOKEN: '',
            AGENTFEED_CI: '1'
          }
        });
      } catch (error) {
        failure = cliFailure(error);
      }

      expect(failure?.stderr).toContain('Browser login is disabled in CI.');
      expect(failure?.stderr).toContain('AGENTFEED_TOKEN');
      expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
      expect(failure?.stderr).toContain('Run: agentfeed login --browser');
      expect(failure?.stderr).toContain('Run: agentfeed rotate --browser');
      expect(failure?.stdout ?? '').toBe('');
      expect(requestCount).toBe(0);
      expect(Date.now() - startedAt).toBeLessThan(5000);
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });


  it('login fails fast in CI even when an environment token is already present', async () => {
    let requestCount = 0;
    const server = await import('node:http').then(({ createServer }) => createServer((_req, res) => {
      requestCount += 1;
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_BROWSER_SESSION_REQUEST', message: 'Unexpected browser session request', details: {} } }));
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    const startedAt = Date.now();

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
      try {
        await execFileAsync(process.execPath, [cliPath, 'login', '--no-open', '--api-base-url', `http://127.0.0.1:${address.port}/v1`], {
          cwd: dir,
          encoding: 'utf8',
          env: {
            ...process.env,
            HOME: home,
            AGENTFEED_TOKEN: 'af_live_existing_ci_token',
            AGENTFEED_CI: '1'
          }
        });
      } catch (error) {
        failure = cliFailure(error);
      }

      expect(failure?.stderr).toContain('Browser login is disabled in CI.');
      expect(failure?.stderr).toContain('If AGENTFEED_TOKEN is already set, run non-login AgentFeed commands directly.');
      expect(failure?.stderr).toContain('Run: agentfeed login --browser');
      expect(failure?.stderr).toContain('Run: agentfeed rotate --browser');
      expect(failure?.stdout ?? '').toBe('');
      expect(requestCount).toBe(0);
      expect(Date.now() - startedAt).toBeLessThan(5000);
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
