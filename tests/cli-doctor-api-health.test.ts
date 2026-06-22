import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-doctor-api-health-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('doctor API health diagnostics', () => {
  it('doctor classifies API DNS failures with host and API base remediation', () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://agentfeed-doctor.invalid/v1',
        AGENTFEED_API_TIMEOUT_MS: '50'
      }
    });

    expect(stdout).toContain('API base URL configured: https://agentfeed-doctor.invalid/v1');
    expect(stdout).toContain('API ready: no (DNS lookup failed for agentfeed-doctor.invalid');
    expect(stdout).toContain('API compatibility: no (DNS lookup failed for agentfeed-doctor.invalid');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed doctor');
    expect(stdout).toContain('AGENTFEED_API_BASE_URL');
  });

  it('doctor reports remote token expiry and warns when it is near expiry', async () => {
    const soon = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const requestedUrls: string[] = [];
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url) requestedUrls.push(req.url);
      if (req.url === '/health/ready') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ready', database: { connected: true }, migration: { up_to_date: true } }));
        return;
      }
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
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
        }));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({
          data: {
            ok: true,
            user: {
              id: 'user-1',
              username: 'downingmoon',
              display_name: 'Downing Moon',
              avatar_url: null
            },
            token: {
              id: 'token-1',
              name: 'CLI: test',
              created_at: '2026-06-01T00:00:00Z',
              last_used_at: null,
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

      expect(stdout).toContain('API ready: yes (200)');
      expect(requestedUrls).toContain('/health/ready');
      expect(requestedUrls).toContain('/v1/metadata');
      expect(requestedUrls).not.toContain('/health');
      expect(stdout).toContain('API compatibility: yes (v1 / 2026-06-03)');
      expect(stdout).toContain('ingestion token valid: yes (200)');
      expect(stdout).toContain(`ingestion token expires at: ${soon}`);
      expect(stdout).toContain('Warnings');
      expect(stdout).toContain('Warning: ingestion token expires soon');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('agentfeed rotate');
      expect(stdout).not.toContain('af_live_env_status');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
