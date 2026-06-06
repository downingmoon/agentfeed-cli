import { beforeAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-init-hook-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOME: home,
      AGENTFEED_TOKEN: '',
      AGENTFEED_CI: '1',
      FORCE_COLOR: undefined
    }
  });
}

async function initProject(): Promise<void> {
  await runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);
}

describe('CLI init and hook setup UX', () => {
  it('prints a sectioned initialization summary with setup next actions', async () => {
    const { stdout, stderr } = await runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);

    expect(stdout).toContain('AgentFeed initialized');
    expect(stdout).toContain('AgentFeed initialized.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Project: setup-polish');
    expect(stdout).toContain('Visibility: private');
    expect(stdout).toContain('Config: .agentfeed/config.json');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed login');
    expect(stdout).toContain('agentfeed hook install claude-code');
    expect(stdout).toContain('agentfeed share --dry');
    expect(stderr).toBe('');
  });

  it('explains hook install dry runs without writing Claude settings', async () => {
    await initProject();

    const { stdout, stderr } = await runCli(['hook', 'install', 'claude-code', '--dry-run']);

    expect(stdout).toContain('AgentFeed hook dry run');
    expect(stdout).toContain('Would install AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Target: claude-code');
    expect(stdout).toContain('Action: install');
    expect(stdout).toContain('Scope: project');
    expect(stdout).toContain('Dry run: yes');
    expect(stdout).toMatch(/Settings: .*\.claude\/settings\.json/);
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed hook install claude-code');
    expect(stderr).toBe('');
    expect(existsSync(join(dir, '.claude', 'settings.json'))).toBe(false);
  });

  it('prints hook install next actions and writes the AgentFeed hook once', async () => {
    await initProject();

    const { stdout, stderr } = await runCli(['hook', 'install', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook installed');
    expect(stdout).toContain('Installed AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Target: claude-code');
    expect(stdout).toContain('Action: install');
    expect(stdout).toContain('Scope: project');
    expect(stdout).toContain('Dry run: no');
    expect(stdout).toMatch(/Settings: .*\.claude\/settings\.json/);
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stdout).toContain('agentfeed share --dry');
    expect(stderr).toBe('');

    const settings = JSON.parse(await readFile(join(dir, '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).toContain('agentfeed collect --source claude-code');
  });

  it('prints hook uninstall summary while preserving the settings path', async () => {
    await initProject();
    await runCli(['hook', 'install', 'claude-code']);

    const { stdout, stderr } = await runCli(['hook', 'uninstall', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook removed');
    expect(stdout).toContain('Uninstalled AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Target: claude-code');
    expect(stdout).toContain('Action: uninstall');
    expect(stdout).toContain('Scope: project');
    expect(stdout).toMatch(/Settings: .*\.claude\/settings\.json/);
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stderr).toBe('');

    const settings = JSON.parse(await readFile(join(dir, '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).not.toContain('agentfeed collect --source claude-code');
  });
});
