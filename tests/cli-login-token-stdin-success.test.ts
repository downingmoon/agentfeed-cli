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

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-login-token-stdin-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('login token-stdin success output', () => {
  it('login reads a token from stdin without requiring the secret in argv or output', async () => {
    const token = 'af_live_stdin_secret';
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadata()));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        expect(req.headers.authorization).toBe(`Bearer ${token}`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            user: { id: 'user-stdin', username: 'stdin-user', display_name: 'Stdin User', avatar_url: null },
            token: {
              id: 'token-stdin',
              name: 'CLI stdin token',
              created_at: '2026-06-01T00:00:00Z',
              last_used_at: null,
              expires_at: '2026-06-15T00:00:00Z',
              expires_in_seconds: 1_000_000,
              expiring_soon: false,
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
      const { stdout, stderr } = await execFileWithInput(
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

      expect(stdout).toContain('AgentFeed credentials saved.');
      expect(stdout).toContain('AgentFeed credentials saved');
      expect(stdout).toContain('Summary');
      expect(stdout).toContain('Credentials: saved');
      expect(stdout).toContain(`API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Next');
      expect(stdout).toContain('agentfeed status');
      expect(stdout).toContain('agentfeed share --dry');
      expect(stdout).not.toContain(token);
      expect(stderr).not.toContain(token);
      const saved = JSON.parse(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved.ingestion_token).toBe(token);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('login prints machine-readable token-stdin results without leaking the secret', async () => {
    const token = 'af_live_stdin_json_secret';
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadata()));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        expect(req.headers.authorization).toBe(`Bearer ${token}`);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            user: { id: 'user-stdin-json', username: 'stdin-json-user', display_name: 'Stdin JSON User', avatar_url: null },
            token: {
              id: 'token-stdin-json',
              name: 'CLI stdin JSON token',
              created_at: '2026-06-01T00:00:00Z',
              last_used_at: null,
              expires_at: '2026-06-15T00:00:00Z',
              expires_in_seconds: 1_000_000,
              expiring_soon: false,
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
      const { stdout, stderr } = await execFileWithInput(
        ['login', '--token-stdin', '--json', '--api-base-url', `http://127.0.0.1:${address.port}/v1`],
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

      const output = JSON.parse(stdout);
      expect(stderr).not.toContain(token);
      expect(stdout).not.toContain(token);
      expect(output).toMatchObject({
        saved: true,
        api_base_url: `http://127.0.0.1:${address.port}/v1`,
        token_expires_at: null,
        warnings: [],
        next_actions: ['agentfeed status', 'agentfeed share --dry']
      });
      expect(stdout).not.toContain('AgentFeed credentials saved');
      expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
      const saved = JSON.parse(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved.ingestion_token).toBe(token);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

});
