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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-rotate-ci-env-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('rotate CI and environment-token failures', () => {
  it('rotate fails fast in CI with token remediation and no browser session request', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_old_secret',
      token_expires_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));
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
      let failure: CliFailure | undefined;
      try {
        await execFileAsync(process.execPath, [cliPath, 'rotate', '--api-base-url', `http://127.0.0.1:${address.port}/v1`], {
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
      expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
      expect(failure?.stderr).toContain('Run: agentfeed login --browser');
      expect(failure?.stderr).toContain('Run: agentfeed rotate --browser');
      expect(failure?.stdout ?? '').toBe('');
      expect(requestCount).toBe(0);
      expect(Date.now() - startedAt).toBeLessThan(5000);
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).resolves.toContain('af_live_old_secret');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rotate refuses environment tokens with secret-manager remediation and no secret output', async () => {
    let failure: CliFailure | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'rotate'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_env_secret',
          AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        },
      });
    } catch (error) {
      failure = cliFailure(error);
    }

    expect(failure).toBeTruthy();
    expect(failure?.stderr).toContain('AGENTFEED_TOKEN is set');
    expect(failure?.stderr).toContain('secret manager');
    expect(failure?.stderr).toContain('unset AGENTFEED_TOKEN && agentfeed rotate --browser');
    expect(failure?.stderr).toContain('agentfeed status');
    expect(failure?.stderr).not.toContain('af_live_env_secret');
    expect(failure?.stdout ?? '').toBe('');
  });
});
