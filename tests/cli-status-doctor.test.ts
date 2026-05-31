import { beforeAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

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

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-status-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status and doctor provenance output', () => {
  it('status warns when a repo .env API URL is ignored as unsafe', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('User/token source: missing');
    expect(stdout).toContain('API base URL: https://api.agentfeed.dev/v1');
    expect(stdout).toContain('API base URL source: default');
    expect(stdout).toContain('Warning: ignored non-local AGENTFEED_API_BASE_URL from .env (evil.example)');
  });

  it('status reports saved browser-login token expiry without printing the token', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_saved_secret',
      token_expires_at: '2026-06-15T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Token expires at: 2026-06-15T00:00:00.000Z');
    expect(stdout).not.toContain('af_live_saved_secret');
  });

  it('login no-open no-save prints safe browser-login status text without credentials', async () => {
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/auth/cli/sessions' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            session_id: 'session-cli-ux',
            authorize_url: 'http://127.0.0.1:3001/cli/authorize?session_id=session-cli-ux',
            expires_at: '2026-05-20T00:05:00Z',
            poll_interval_seconds: 1
          }
        }));
        return;
      }
      if (req.url === '/v1/auth/cli/sessions/session-cli-ux/exchange' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            token: 'af_live_cli_ux_secret',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-cli-ux', username: 'cli-ux-user' }
          }
        }));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'login', '--no-open', '--no-save', '--api-base-url', `http://127.0.0.1:${address.port}/v1`], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
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

      expect(stdout).toContain(`Using AgentFeed API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Open this URL to authorize AgentFeed CLI:');
      expect(stdout).toContain('http://127.0.0.1:3001/cli/authorize?session_id=session-cli-ux');
      expect(stdout).toContain('Waiting for browser approval. This terminal will finish automatically after approval.');
      expect(stdout).toContain('AgentFeed browser login complete (not saved).');
      expect(stdout).toContain('No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.');
      expect(stdout).not.toContain('af_live_cli_ux_secret');
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('login reads a token from stdin without requiring the secret in argv or output', async () => {
    const token = 'af_live_stdin_secret';

    const { stdout, stderr } = await execFileWithInput(
      ['login', '--token-stdin', '--api-base-url', 'http://127.0.0.1:9/v1'],
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

    expect(stdout).toContain('AgentFeed credentials saved.');
    expect(stdout).toContain('API: http://127.0.0.1:9/v1');
    expect(stdout).not.toContain(token);
    expect(stderr).not.toContain(token);
    const saved = JSON.parse(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
    expect(saved.ingestion_token).toBe(token);
  });

  it('does not advertise literal argv token login in help output', () => {
    const stdout = execFileSync(process.execPath, [cliPath, '--help'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('agentfeed login --token-stdin');
    expect(stdout).toContain('agentfeed login --token - --no-save');
    expect(stdout).not.toContain('agentfeed login --token <token>');
  });

  it('rejects literal argv token login by default before saving credentials', async () => {
    const token = 'af_live_argv_should_not_be_accepted';

    let failure: { stderr?: string; stdout?: string } | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'login', '--token', token, '--api-base-url', 'http://127.0.0.1:9/v1'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN: '',
          AGENTFEED_CREDENTIAL_STORE: 'file'
        }
      });
    } catch (error) {
      failure = error as { stderr?: string; stdout?: string };
    }

    expect(failure?.stderr).toContain('Literal token input through --token <token> is disabled');
    expect(failure?.stderr).toContain('agentfeed login --token-stdin');
    expect(failure?.stderr).not.toContain(token);
    expect(failure?.stdout ?? '').toBe('');
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('login fails fast in CI with token remediation and no browser session request', async () => {
    let requestCount = 0;
    const server = await import('node:http').then(({ createServer }) => createServer((_req, res) => {
      requestCount += 1;
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_BROWSER_SESSION_REQUEST' } }));
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
        failure = error as { stderr?: string; stdout?: string };
      }

      expect(failure?.stderr).toContain('Browser login is disabled in CI.');
      expect(failure?.stderr).toContain('AGENTFEED_TOKEN');
      expect(failure?.stderr).toContain('agentfeed login --token-stdin');
      expect(failure?.stderr).toContain('--browser');
      expect(failure?.stdout ?? '').toBe('');
      expect(requestCount).toBe(0);
      expect(Date.now() - startedAt).toBeLessThan(5000);
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rotate replaces a saved token via the ingestion rotation endpoint without printing secrets', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_old_secret',
      token_expires_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/ingest/token/rotate') {
        expect(req.headers.authorization).toBe('Bearer af_live_old_secret');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            id: 'token-new',
            name: 'CLI: rotated',
            token: 'af_live_new_secret',
            created_at: '2026-05-30T00:00:00Z',
            expires_at: newExpiry,
            token_expires_at: newExpiry,
            rotated_from: 'token-old',
            rotated_at: '2026-05-30T00:01:00Z',
            user: { id: 'user-1', username: 'downingmoon' }
          }
        }));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'rotate'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stdout).toContain('AgentFeed token rotated.');
      expect(stdout).toContain('Rotated from: token-old');
      expect(stdout).toContain('New token ID: token-new');
      expect(stdout).not.toContain('af_live_old_secret');
      expect(stdout).not.toContain('af_live_new_secret');
      const saved = JSON.parse(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved).toMatchObject({
        ingestion_token: 'af_live_new_secret',
        token_expires_at: newExpiry,
        user: { id: 'user-1', username: 'downingmoon' }
      });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rotate refuses environment tokens with secret-manager remediation and no secret output', async () => {
    let failure: { stderr?: string } | undefined;
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
      failure = error as { stderr?: string };
    }

    expect(failure).toBeTruthy();
    expect(failure?.stderr).toContain('AGENTFEED_TOKEN is set');
    expect(failure?.stderr).toContain('secret manager');
    expect(failure?.stderr).toContain('unset AGENTFEED_TOKEN && agentfeed rotate --browser');
    expect(failure?.stderr).toContain('agentfeed status');
    expect(failure?.stderr).not.toContain('af_live_env_secret');
  });

  it('doctor reports credential and API source provenance before network checks', () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_env_status',
        AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        AGENTFEED_API_TIMEOUT_MS: '50'
      }
    });

    expect(stdout).toContain('credential source: environment (AGENTFEED_TOKEN)');
    expect(stdout).toContain('API base URL configured: http://127.0.0.1:9/v1');
    expect(stdout).toContain('API base URL source: environment (AGENTFEED_API_BASE_URL)');
    expect(stdout).toContain('API reachable: no');
  });

  it('doctor reports remote token expiry and warns when it is near expiry', async () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            token: {
              id: 'token-1',
              name: 'CLI: test',
              expires_at: soon,
              expires_in_seconds: 86_400,
              expiring_soon: true
            }
          }
        }));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'doctor'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: 'af_live_env_status',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`
        }
      });

      expect(stdout).toContain('ingestion token valid: yes (200)');
      expect(stdout).toContain(`ingestion token expires at: ${soon}`);
      expect(stdout).toContain('Warning: ingestion token expires soon');
      expect(stdout).not.toContain('af_live_env_status');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
