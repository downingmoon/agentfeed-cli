import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile, execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-status-readiness-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status readiness guidance', () => {
  it('status reports remediation instead of failing when environment API URL is remote http', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://161.33.171.81:18080/v1',
        AGENTFEED_ALLOW_INSECURE_API: '',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed status');
    expect(stdout).toMatch(/invalid API URL|Invalid AgentFeed API base URL|http is allowed only for localhost/i);
    expect(stdout).toMatch(/AGENTFEED_API_BASE_URL|Use https|AGENTFEED_ALLOW_INSECURE_API=1/i);
    expect(stdout).toContain('Next');
    expect(stdout).toContain('unset AGENTFEED_API_BASE_URL');
    expect(stdout).toContain('AGENTFEED_ALLOW_INSECURE_API=1 agentfeed status');
    expect(stdout).toContain('agentfeed doctor');
    expect(stdout).not.toContain('  agentfeed login');
    expect(stdout).not.toContain('af_live');
    expect(stderr).toBe('');
  });

  it('status recommends project initialization before login when setup has not started', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed status');
    expect(stdout).toContain('Health: attention needed');
    expect(stdout).toContain('Readiness');
    expect(stdout).toContain('Setup progress: 2/5 ready · 3 need attention');
    expect(stdout).toContain('Account: token missing → agentfeed login');
    expect(stdout).toContain('Project: not initialized → git init && agentfeed init');
    expect(stdout).toContain('Git: repository not detected → git init');
    expect(stdout).toContain('Project initialized: no');
    expect(stdout).toContain('User/token: missing');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. git init && agentfeed init');
    expect(stdout).toContain('git init && agentfeed init');
    expect(stdout).toContain('agentfeed init --no-git-check');
    expect(stdout).toContain('agentfeed login');
    expect(stdout.indexOf('git init && agentfeed init')).toBeLessThan(stdout.indexOf('agentfeed login'));
    expect(stderr).toBe('');
  });

  it('status keeps local dry-run sharing discoverable when only login is missing', async () => {
    execFileSync('git', ['init', '-q'], {
      cwd: dir,
      encoding: 'utf8',
      env: process.env
    });
    execFileSync(process.execPath, [cliPath, 'init', '--project-name', 'status-next'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://agentfeed.api.downingmoon.dev/v1',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('Project initialized: yes');
    expect(stdout).toContain('User/token: missing');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed login');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed share --dry');
    expect(stdout.indexOf('agentfeed login')).toBeLessThan(stdout.indexOf('agentfeed share --dry'));
    expect(stderr).toBe('');
  });

  it('status warns when a repo .env API URL is ignored as unsafe', async () => {
    await writeFile(join(dir, '.env'), 'AGENTFEED_API_BASE_URL=https://evil.example/v1\n');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('User/token source: missing');
    expect(stdout).toContain('API base URL: https://agentfeed.api.downingmoon.dev/v1');
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
});
