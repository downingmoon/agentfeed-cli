import { beforeAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
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

async function runCliFailure(args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    await runCli(args);
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string };
    return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '' };
  }
  throw new Error(`Expected agentfeed ${args.join(' ')} to fail`);
}

async function initProject(): Promise<void> {
  await runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);
}

describe('CLI init and hook setup UX', () => {
  it('gives copyable recovery when init runs outside a git repository', async () => {
    const failure = await runCliFailure(['init']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('Not inside a Git repository.');
    expect(failure.stderr).toContain('Run: agentfeed init --no-git-check');
    expect(failure.stderr).toContain('Run: git init && agentfeed init');
  });

  it('prints a sectioned initialization summary with setup next actions', async () => {
    const { stdout, stderr } = await runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);

    expect(stdout).toContain('AgentFeed initialized');
    expect(stdout).toContain('Project config created.');
    expect(stdout).not.toContain('AgentFeed initialized.\n\nSummary');
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

  it('keeps existing config when init is rerun without force', async () => {
    await initProject();
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const { stdout, stderr } = await runCli(['init', '--no-git-check', '--project-name', 'overwritten']);
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(stdout).toContain('AgentFeed already initialized');
    expect(stdout).toContain('Existing AgentFeed config kept.');
    expect(stdout).toContain('Project: setup-polish');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stdout).toContain('agentfeed share --dry');
    expect(stdout).toContain('agentfeed init --force');
    expect(stderr).toBe('');
    expect(saved.project.name).toBe('setup-polish');
    expect(saved.project.tags).toEqual(['custom']);
  });

  it('backs up existing config when init is forced', async () => {
    await initProject();
    const configPath = join(dir, '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const { stdout, stderr } = await runCli(['init', '--no-git-check', '--project-name', 'forced-setup', '--force']);
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(stdout).toContain('AgentFeed reinitialized');
    expect(stdout).toContain('AgentFeed config recreated after backing up existing files.');
    expect(stdout).toContain('Project: forced-setup');
    expect(stdout).toContain('Backups');
    expect(stdout).toContain('.agentfeed/backups/config.');
    expect(stdout).toContain('.agentfeed/backups/redaction-rules.');
    expect(stdout).toContain('agentfeed login');
    expect(stderr).toBe('');
    expect(saved.project.name).toBe('forced-setup');
    expect(saved.project.tags).toEqual([]);
  });

  it('guides init before hook install when the project is not initialized', async () => {
    const failure = await runCliFailure(['hook', 'install', 'claude-code']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed project is not initialized.');
    expect(failure.stderr).toContain('Run: agentfeed init');
    expect(failure.stderr).toContain('Run: git init && agentfeed init');
    expect(failure.stderr).toContain('Run: agentfeed init --no-git-check');
    expect(failure.stderr).not.toContain('TypeError');
    expect(existsSync(join(dir, '.claude', 'settings.json'))).toBe(false);
  });

  it('lets hook uninstall clean up from an uninitialized directory without creating settings', async () => {
    const { stdout, stderr } = await runCli(['hook', 'uninstall', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook removed');
    expect(stdout).toContain('Uninstalled AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Action: uninstall');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stderr).toBe('');
    expect(existsSync(join(dir, '.claude', 'settings.json'))).toBe(false);
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

  it('prints machine-readable hook install dry-run next actions without human headings', async () => {
    await initProject();

    const { stdout, stderr } = await runCli(['hook', 'install', 'claude-code', '--dry-run', '--json']);
    const output = JSON.parse(stdout) as {
      target?: string;
      action?: string;
      scope?: string;
      dry_run?: boolean;
      settings_path?: string;
      backup_path?: string | null;
      next_actions?: string[];
    };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      target: 'claude-code',
      action: 'install',
      scope: 'project',
      dry_run: true,
      backup_path: null
    });
    expect(output.settings_path).toMatch(/\.claude\/settings\.json$/);
    expect(output.next_actions).toEqual(['agentfeed hook install claude-code']);
    expect(stdout).not.toContain('AgentFeed hook dry run');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
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


  it('prints machine-readable hook uninstall next actions without human headings', async () => {
    await initProject();
    await runCli(['hook', 'install', 'claude-code']);

    const { stdout, stderr } = await runCli(['hook', 'uninstall', 'claude-code', '--json']);
    const output = JSON.parse(stdout) as { action?: string; target?: string; scope?: string; settings_path?: string; next_actions?: string[] };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      target: 'claude-code',
      action: 'uninstall',
      scope: 'project',
      next_actions: ['agentfeed status']
    });
    expect(output.settings_path).toMatch(/\.claude\/settings\.json$/);
    expect(stdout).not.toContain('AgentFeed hook removed');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);

    const settings = JSON.parse(await readFile(join(dir, '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).not.toContain('agentfeed collect --source claude-code');
  });
});
