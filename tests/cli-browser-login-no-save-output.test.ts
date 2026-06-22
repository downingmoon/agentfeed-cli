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

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-browser-login-no-save-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('browser login no-save output', () => {
  it('login no-open no-save prints safe browser-login status text without credentials', async () => {
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/auth/cli/sessions' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            session_id: 'session-cli-ux',
            authorize_url: 'http://127.0.0.1:3001/cli/authorize?session_id=session-cli-ux',
            user_code: '123-456',
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
            token_id: 'token-cli-ux',
            token_expires_at: '2026-06-15T00:00:00Z',
            user: { id: 'user-cli-ux', username: 'cli-ux-user', display_name: 'CLI UX User' }
          }
        }));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        expect(req.headers.authorization).toBe('Bearer af_live_cli_ux_secret');
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            user: { id: 'user-cli-ux', username: 'cli-ux-user', display_name: 'CLI UX User', avatar_url: null },
            token: {
              id: 'token-cli-ux',
              name: 'CLI UX token',
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

      expect(stdout).toContain('AgentFeed browser authorization');
      expect(stdout).toContain('Connection');
      expect(stdout).toContain(`Using AgentFeed API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Authorize');
      expect(stdout).toContain('Open this URL to authorize AgentFeed CLI:');
      expect(stdout).toContain('  http://127.0.0.1:3001/cli/authorize?session_id=session-cli-ux');
      expect(stdout).toContain('http://127.0.0.1:3001/cli/authorize?session_id=session-cli-ux');
      expect(stdout).toContain('Approval code: 123-456');
      expect(stdout).toContain('Enter this code in the browser before approving the CLI session.');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('Waiting for browser approval. This terminal will finish automatically after approval.');
      expect(stdout).toContain('AgentFeed login complete (not saved)');
      expect(stdout).toContain('AgentFeed browser login complete (not saved).');
      expect(stdout).toContain('Summary');
      expect(stdout).toContain('Credentials: not saved');
      expect(stdout).toContain(`API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Token expires at: 2026-06-15T00:00:00.000Z');
      expect(stdout).toContain('No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.');
      expect(stdout).toContain('agentfeed login');
      expect(stdout).toContain('agentfeed status');
      expect(stdout).not.toContain('af_live_cli_ux_secret');
      await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
