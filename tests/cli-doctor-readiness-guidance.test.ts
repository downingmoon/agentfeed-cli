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

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-doctor-readiness-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('doctor readiness guidance', () => {
  it('doctor lists local setup actions alongside API recheck when multiple checks fail', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://127.0.0.1:9/v1',
        AGENTFEED_API_TIMEOUT_MS: '50',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed doctor');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Overall: attention needed');
    expect(stdout).toContain('Account: token missing');
    expect(stdout).toContain('Project: not initialized');
    expect(stdout).toContain('API: API not reachable');
    expect(stdout).toContain('project config valid: no');
    expect(stdout).toContain('ingestion token exists: no');
    expect(stdout).toContain('API ready: no');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. git init && agentfeed init');
    expect(stdout).toContain('git init && agentfeed init');
    expect(stdout).toContain('agentfeed init --no-git-check');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed doctor');
    const nextSection = stdout.slice(stdout.lastIndexOf('Next'));
    expect(nextSection.indexOf('git init && agentfeed init')).toBeLessThan(nextSection.indexOf('agentfeed login'));
    expect(nextSection.indexOf('agentfeed login')).toBeLessThan(nextSection.indexOf('agentfeed doctor'));
    expect(stderr).toBe('');
  });

  it('doctor keeps local dry-run sharing discoverable when an initialized project only lacks login', async () => {
    execFileSync('git', ['init', '-q'], {
      cwd: dir,
      encoding: 'utf8',
      env: process.env
    });
    execFileSync(process.execPath, [cliPath, 'init', '--project-name', 'doctor-next'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/health/ready') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ status: 'ready' }));
        return;
      }
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadata()));
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor'], {
        cwd: dir,
        encoding: 'utf8',
        env: {
          ...process.env,
          HOME: home,
          AGENTFEED_TOKEN: '',
          AGENTFEED_API_BASE_URL: `http://127.0.0.1:${address.port}/v1`,
          FORCE_COLOR: undefined
        }
      });

      expect(stdout).toContain('project config valid: yes');
      expect(stdout).toContain('ingestion token exists: no');
      expect(stdout).toContain('API ready: yes');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('Recommended order:');
      expect(stdout).toContain('  1. agentfeed login');
      expect(stdout).toContain('agentfeed login');
      expect(stdout).toContain('agentfeed share --dry');
      expect(stdout.indexOf('agentfeed login')).toBeLessThan(stdout.indexOf('agentfeed share --dry'));
      expect(stderr).toBe('');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('doctor reports remediation instead of failing when environment API URL is remote http', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://161.33.171.81:18080/v1',
        AGENTFEED_ALLOW_INSECURE_API: '',
        AGENTFEED_API_TIMEOUT_MS: '50',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed doctor');
    expect(stdout).toContain('Warnings');
    expect(stdout).toContain('Fix first:');
    expect(stdout).toContain('  1. API: invalid API base URL');
    expect(stdout).toContain('     Run: unset AGENTFEED_API_BASE_URL');
    expect(stdout).toContain('Next');
    expect(stdout).toMatch(/invalid API URL|Invalid AgentFeed API base URL|http is allowed only for localhost/i);
    expect(stdout).toMatch(/AGENTFEED_API_BASE_URL|Use https|AGENTFEED_ALLOW_INSECURE_API=1/i);
    expect(stdout).toContain('unset AGENTFEED_API_BASE_URL');
    expect(stdout).not.toContain('af_live');
    expect(stderr).toBe('');
  });
});
