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
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-?]*[ -/]*[@-~]/;

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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-status-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status and doctor provenance output', () => {
  it('status presents sectioned UX copy while preserving required diagnostics', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'status-polish'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).toContain('AgentFeed status');
    expect(stdout).toContain('Readiness');
    expect(stdout).toContain('Setup progress: 3/5 ready · 2 need attention');
    expect(stdout).toContain('API: base URL accepted');
    expect(stdout).toContain('Account: token missing → agentfeed login');
    expect(stdout).toContain('Project: initialized');
    expect(stdout).toContain('Uploads: no pending uploads');
    expect(stdout).toContain('Account');
    expect(stdout).toContain('Project');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('User/token source: missing');
    expect(stdout).toContain('API base URL: https://api.agentfeed.dev/v1');
    expect(stdout).toContain('Project initialized: yes');
    expect(stdout).toContain('Project name: status-polish');
    expect(stdout).toContain('Git repository:');
    expect(stdout).toContain('Claude Code hook:');
    expect(stdout).toContain('Local drafts count:');
    expect(stdout).toContain('Pending upload count:');
  });

  it('status prints without ANSI escapes when NO_COLOR is set', async () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        NO_COLOR: '1',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('status prints without ANSI escapes when stdout is not a TTY', async () => {
    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        NO_COLOR: '',
        FORCE_COLOR: undefined
      }
    });

    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
  });

  it('status and doctor report empty git repositories before the first commit', async () => {
    execFileSync('git', ['init', '-q'], {
      cwd: dir,
      encoding: 'utf8',
      env: process.env
    });
    execFileSync(process.execPath, [cliPath, 'init', '--project-name', 'empty-git'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        FORCE_COLOR: undefined
      }
    });
    expect(stdout).toContain('Git repository: yes');

    const { stdout: statusJsonStdout } = await execFileAsync(process.execPath, [cliPath, 'status', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
        FORCE_COLOR: undefined
      }
    });
    const statusJson = JSON.parse(statusJsonStdout) as { project: { git_repository: boolean } };
    expect(statusJson.project.git_repository).toBe(true);

    const { stdout: doctorJsonStdout } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
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
    const doctorJson = JSON.parse(doctorJsonStdout) as { project: Array<{ name: string; value: string }> };
    expect(doctorJson.project.find((row) => row.name === 'current directory is git repository')?.value).toBe('yes');
  });

  it('status json prints parseable automation output without headings or secrets', async () => {
    const token = 'af_live_status_json_secret';
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'status-json'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: token,
      token_expires_at: '2026-06-15T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'status', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        FORCE_COLOR: undefined
      }
    });

    const output = JSON.parse(stdout) as {
      health: string;
      summary: { status: string; ready: number; attention: number; total: number };
      readiness: Array<{ name: string; status: string; detail: string; next_action?: string }>;
      account: { token_configured: boolean; token_expires_at: string | null };
      api: { base_url: string };
      project: { initialized: boolean; name: string | null };
      collection: { local_drafts_count: number; pending_upload_count: number };
      warnings: string[];
      next_actions: string[];
    };
    expect(stderr).toBe('');
    expect(output.health).toBeTruthy();
    expect(output.summary).toEqual({ status: 'attention_needed', ready: 4, attention: 1, total: 5 });
    expect(output.readiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'API', status: 'ready', detail: 'base URL accepted' }),
      expect.objectContaining({ name: 'Account', status: 'ready', detail: 'token configured' }),
      expect.objectContaining({ name: 'Project', status: 'ready', detail: 'initialized' }),
      expect.objectContaining({ name: 'Uploads', status: 'ready', detail: 'no pending uploads' })
    ]));
    expect(output.account.token_configured).toBe(true);
    expect(output.account.token_expires_at).toBe('2026-06-15T00:00:00Z');
    expect(output.api.base_url).toBe('http://127.0.0.1:9/v1');
    expect(output.project).toMatchObject({ initialized: true, name: 'status-json' });
    expect(output.collection.local_drafts_count).toBe(0);
    expect(output.collection.pending_upload_count).toBe(0);
    expect(Array.isArray(output.warnings)).toBe(true);
    expect(output.next_actions).toEqual(['agentfeed share --yes']);
    expect(stdout).not.toContain('AgentFeed status');
    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stdout).not.toContain(token);
  });

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
        AGENTFEED_API_BASE_URL: 'https://api.agentfeed.dev/v1',
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

  it('status reports the collection cursor and warns when pending drafts may make the next collect look empty', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'cursor-status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await writeFile(join(dir, '.agentfeed', 'state.json'), JSON.stringify({ last_collected_at: '2026-05-20T02:00:00.000Z' }));
    await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'drafts', 'draft_pending.json'), JSON.stringify({
      id: 'draft_pending',
      upload: { uploaded: false }
    }));

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Last collection cursor: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('Next default collection since: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('Uploads: 1 pending draft → agentfeed publish --latest --yes');
    expect(stdout).toContain('Warning: pending local drafts exist while a collection cursor is set');
    expect(stdout).toContain('--all/--since');
  });

  it('status reports malformed collection cursor as an explicit warning', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'cursor-status-invalid'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await writeFile(join(dir, '.agentfeed', 'state.json'), '{not-json');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Health: attention needed');
    expect(stdout).toContain('AgentFeed collection cursor is unreadable');
    expect(stdout).toContain('.agentfeed/state.json');
    expect(stdout).toContain('Last collection cursor: none');
    expect(stdout).toContain('Next default collection since: beginning');
  });

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

  it('login reads a token from stdin without requiring the secret in argv or output', async () => {
    const token = 'af_live_stdin_secret';
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
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

      const output = JSON.parse(stdout) as {
        saved?: boolean;
        api_base_url?: string;
        token_expires_at?: string | null;
        warnings?: string[];
        next_actions?: string[];
      };
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

  it('login --json refuses browser auth so stdout stays parseable', async () => {
    let failure: { stdout?: string; stderr?: string } | undefined;
    try {
      await execFileAsync(process.execPath, [cliPath, 'login', '--json', '--no-open'], {
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
      failure = error as { stdout?: string; stderr?: string };
    }

    const output = JSON.parse(failure?.stdout ?? '{}') as {
      error?: { message?: string; details?: string[] };
      next_actions?: string[];
    };
    expect(output.error?.message).toContain('login --json requires token input');
    expect(output.next_actions).toEqual([
      'printf %s "$TOKEN" | agentfeed login --token-stdin --json',
      'printf %s "$TOKEN" | agentfeed login --token - --json --no-save'
    ]);
    expect(failure?.stderr ?? '').toBe('');
    expect(failure?.stdout ?? '').not.toContain('AgentFeed browser authorization');
  });

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
        failure = error as { stderr?: string; stdout?: string };
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

  it('logout removes saved credentials and warns when an environment token remains active', async () => {
    const token = 'af_live_logout_cli_secret';
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: token,
      created_at: '2026-05-30T00:00:00Z'
    }));

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'logout', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: 'af_live_env_logout_still_active'
      }
    });

    const result = JSON.parse(stdout) as {
      credentials_file_deleted: boolean;
      environment_token_active: boolean;
      warnings: string[];
      security_checklist?: Array<{ name: string; status: string; detail: string; next_action?: string }>;
      next_actions?: string[];
    };
    expect(result.credentials_file_deleted).toBe(true);
    expect(result.environment_token_active).toBe(true);
    expect(result.warnings.join('\n')).toContain('AGENTFEED_TOKEN is still set');
    expect(result.security_checklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Saved credentials', status: 'done', detail: 'removed from this machine' }),
      expect.objectContaining({ name: 'Environment token', status: 'attention', detail: 'AGENTFEED_TOKEN is still active in this shell', next_action: 'unset AGENTFEED_TOKEN' })
    ]));
    expect(result.next_actions).toEqual(['agentfeed status']);
    expect(stdout).not.toContain(token);
    expect(stderr).not.toContain(token);
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('logout human output summarizes removed credentials and next action without leaking secrets', async () => {
    const token = 'af_live_logout_human_secret';
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: token,
      created_at: '2026-05-30T00:00:00Z'
    }));

    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'logout'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: ''
      }
    });

    expect(stdout).toContain('AgentFeed logout complete');
    expect(stdout).toContain('AgentFeed saved credentials removed.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Credentials file: removed');
    expect(stdout).toContain('Security checklist');
    expect(stdout).toContain('Saved credentials: removed from this machine');
    expect(stdout).toContain('Environment token: not set in this shell');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stdout).not.toContain(token);
    expect(stderr).not.toContain(token);
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });



  it('status survives malformed Claude Code settings and reports hook as unknown', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'broken-hook'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude', 'settings.json'), '{not-json');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Claude Code hook: unknown');
    expect(stdout).toContain('Warning: Claude Code settings could not be parsed');
    expect(stdout).toContain(join(dir, '.claude', 'settings.json'));
  });

  it('prints package version for npm-installed CLI diagnostics', () => {
    const stdout = execFileSync(process.execPath, [cliPath, '--version'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    const shortStdout = execFileSync(process.execPath, [cliPath, '-v'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    expect(shortStdout).toBe(stdout);
  });

  it('does not advertise literal argv token login in help output', () => {
    const stdout = execFileSync(process.execPath, [cliPath, '--help'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

    expect(stdout).toContain('agentfeed login --token-stdin');
    expect(stdout).toContain('agentfeed logout');
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
    expect(failure?.stderr).toContain('Reason: argv can leak through shell history and process listings.');
    expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(failure?.stderr).toContain('Run: agentfeed login');
    expect(failure?.stderr).toContain('AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1 agentfeed login --token <token>');
    expect(failure?.stderr).not.toContain(token);
    expect(failure?.stdout ?? '').toBe('');
    await expect(readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
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
      failure = error as { stderr?: string; stdout?: string };
    }

    expect(failure?.stderr).toContain('No token received on stdin.');
    expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
    expect(failure?.stderr).toContain('Run: agentfeed login');
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
            AGENTFEED_TOKEN: 'af_live_existing_ci_token',
            AGENTFEED_CI: '1'
          }
        });
      } catch (error) {
        failure = error as { stderr?: string; stdout?: string };
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
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_BROWSER_SESSION_REQUEST' } }));
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');
    const startedAt = Date.now();

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
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
        failure = error as { stderr?: string; stdout?: string };
      }

      expect(failure?.stderr).toContain('Browser login is disabled in CI.');
      expect(failure?.stderr).toContain('Run: printf %s "$TOKEN" | agentfeed login --token-stdin');
      expect(failure?.stderr).toContain('Run: agentfeed login --browser');
      expect(failure?.stderr).toContain('Run: agentfeed rotate --browser');
      expect(failure?.stdout ?? '').toBe('');
      expect(requestCount).toBe(0);
      expect(Date.now() - startedAt).toBeLessThan(5000);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('rotate replaces a saved token through browser-approved session rotation without printing secrets', async () => {
    await mkdir(join(home, '.agentfeed'), { recursive: true });
    await writeFile(join(home, '.agentfeed', 'credentials.json'), JSON.stringify({
      api_base_url: 'http://127.0.0.1:9/v1',
      ingestion_token: 'af_live_old_secret',
      token_expires_at: '2026-06-01T00:00:00Z',
      created_at: '2026-05-30T00:00:00Z'
    }));
    const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    let sessionVerifier: string | undefined;
    const server = await import('node:http').then(({ createServer }) => createServer((req, res) => {
      if (req.url === '/v1/metadata') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify(compatibleMetadata()));
        return;
      }
      if (req.url === '/v1/ingest/status') {
        expect(req.headers.authorization).toBe('Bearer af_live_old_secret');
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
              expiring_soon: true,
            }
          }
        }));
        return;
      }
      if (req.url === '/v1/auth/cli/sessions' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { verifier?: string; replace_token_id?: string };
          expect(body.verifier).toMatch(/^[a-f0-9]{64}$/);
          expect(body.replace_token_id).toBe('token-old');
          sessionVerifier = body.verifier;
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            data: {
              session_id: 'session-rotate',
              authorize_url: 'http://localhost:3001/cli/authorize?session_id=session-rotate',
              user_code: '123-456',
              expires_at: '2026-05-30T00:05:00Z',
              poll_interval_seconds: 1
            }
          }));
        });
        return;
      }
      if (req.url === '/v1/auth/cli/sessions/session-rotate/exchange' && req.method === 'POST') {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(Buffer.from(chunk)));
        req.on('end', () => {
          const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { verifier?: string };
          expect(body.verifier).toBe(sessionVerifier);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify({
            data: {
              token: 'af_live_new_secret',
              token_id: 'token-new',
              token_expires_at: newExpiry,
              rotated_from: 'token-old',
              rotated_at: '2026-05-30T00:01:00Z',
              user: { id: 'user-1', username: 'downingmoon', display_name: 'Downing Moon' }
            }
          }));
        });
        return;
      }
      res.writeHead(404).end();
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      const { stdout } = await execFileAsync(process.execPath, [cliPath, 'rotate', '--no-open'], {
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

      expect(stdout).toContain('AgentFeed token rotated after browser approval.');
      expect(stdout).toContain('Previous saved token was revoked.');
      expect(stdout).toContain('AgentFeed token replacement complete');
      expect(stdout).toContain('Saved replacement token.');
      expect(stdout).toContain('Summary');
      expect(stdout).toContain('Credentials: saved');
      expect(stdout).toContain(`API: http://127.0.0.1:${address.port}/v1`);
      expect(stdout).toContain('Token expires at:');
      expect(stdout).toContain('Next');
      expect(stdout).toContain('agentfeed status');
      expect(stdout).toContain('agentfeed share --dry');
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
      res.end(JSON.stringify({ error: { code: 'UNEXPECTED_SESSION_REQUEST' } }));
    }));
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('test server did not bind');

    try {
      let failure: { stderr?: string; stdout?: string } | undefined;
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
        failure = error as { stderr?: string; stdout?: string };
      }

      expect(failure).toBeTruthy();
      expect(failure?.stderr).toContain('API compatibility check failed');
      expect(failure?.stderr).toContain('before saving credentials');
      expect(failure?.stderr).not.toContain('af_live_old_incompatible_secret');
      expect(sessionRequests).toBe(0);
      const saved = JSON.parse(await readFile(join(home, '.agentfeed', 'credentials.json'), 'utf8'));
      expect(saved.ingestion_token).toBe('af_live_old_incompatible_secret');
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
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'doctor-cursor'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    execFileSync(process.execPath, [
      '-e',
      'require("node:fs").writeFileSync(".agentfeed/state.json", JSON.stringify({ last_collected_at: "2026-05-20T02:00:00.000Z" }))'
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });

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
    expect(stdout).toContain('Runtime');
    expect(stdout).toContain('Account');
    expect(stdout).toContain('API');
    expect(stdout).toContain('Project');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Agent signals');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('API base URL configured: http://127.0.0.1:9/v1');
    expect(stdout).toContain('API base URL source: environment (AGENTFEED_API_BASE_URL)');
    expect(stdout).toContain('API ready: no');
    expect(stdout).toContain('last collection cursor: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('next default collection since: 2026-05-20T02:00:00.000Z');
  });

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

  it('doctor json prints parseable diagnostics without human headings', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
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

    const output = JSON.parse(stdout) as {
      runtime: Array<{ name: string; value: string }>;
      account: Array<{ name: string; value: string }>;
      api: Array<{ name: string; value: string }>;
      project: Array<{ name: string; value: string }>;
      collection: Array<{ name: string; value: string }>;
      summary: { status: string; ready: number; attention: number };
      readiness: Array<{ name: string; status: string; detail: string; next_action?: string }>;
      priority_actions: Array<{ name: string; detail: string; command: string }>;
      warnings: string[];
      agent_signal_summary: {
        detected_count: number;
        missing_count: number;
        signals: Array<{ key: string; label: string; detected: boolean; status: string; path_count: number; guidance: string; next_actions: string[] }>;
      };
      agent_signals: string[];
      next_actions: string[];
    };
    expect(stderr).toBe('');
    expect(output.summary.status).toBe('attention_needed');
    expect(output.summary.attention).toBeGreaterThan(0);
    expect(output.readiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }),
      expect.objectContaining({ name: 'API', status: 'attention', detail: 'invalid API base URL', next_action: 'unset AGENTFEED_API_BASE_URL' })
    ]));
    expect(output.priority_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'API', detail: 'invalid API base URL', command: 'unset AGENTFEED_API_BASE_URL' }),
      expect.objectContaining({ name: 'Account', detail: 'token missing', command: 'agentfeed login' })
    ]));
    expect(output.priority_actions[0]).toMatchObject({ name: 'API', command: 'unset AGENTFEED_API_BASE_URL' });
    expect(output.runtime.some((row) => row.name === 'agentfeed version')).toBe(true);
    expect(output.account.some((row) => row.name === 'credential source')).toBe(true);
    expect(output.api.some((row) => row.name === 'API base URL configured')).toBe(true);
    expect(output.project.some((row) => row.name === 'project config valid')).toBe(true);
    expect(output.collection.some((row) => row.name === 'last collection cursor')).toBe(true);
    expect(output.warnings.join('\n')).toContain('invalid AgentFeed API URL setting ignored for diagnostics');
    expect(output.agent_signal_summary.detected_count + output.agent_signal_summary.missing_count).toBe(output.agent_signal_summary.signals.length);
    expect(output.agent_signal_summary.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'codex',
        label: 'Codex CLI',
        status: expect.stringMatching(/detected|missing/),
        next_actions: expect.arrayContaining(['agentfeed collect --source codex --explain'])
      }),
      expect.objectContaining({
        key: 'claude_code',
        label: 'Claude Code',
        next_actions: expect.arrayContaining(['agentfeed hook install claude-code'])
      })
    ]));
    expect(Array.isArray(output.agent_signals)).toBe(true);
    expect(output.next_actions).toEqual([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed doctor'
    ]);
    expect(stdout).not.toContain('AgentFeed doctor');
    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stdout).not.toContain('af_live');
  });

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
