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

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-logout-credentials-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('logout credential cleanup output', () => {
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



});
