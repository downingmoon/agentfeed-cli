import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCliInitHookHarness } from './cli-init-hook-harness.js';

const harness = createCliInitHookHarness();

describe('CLI init setup UX', () => {
  it('gives copyable recovery when init runs outside a git repository', async () => {
    const failure = await harness.runCliFailure(['init']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('Not inside a Git repository.');
    expect(failure.stderr).toContain('Run: agentfeed init --no-git-check');
    expect(failure.stderr).toContain('Run: git init && agentfeed init');
  });

  it('prints a sectioned initialization summary with setup next actions', async () => {
    const { stdout, stderr } = await harness.runCli(['init', '--no-git-check', '--project-name', 'setup-polish']);

    expect(stdout).toContain('AgentFeed initialized');
    expect(stdout).toContain('Project config created.');
    expect(stdout).not.toContain('AgentFeed initialized.\n\nSummary');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Project: setup-polish');
    expect(stdout).toContain('Visibility: private');
    expect(stdout).toContain('Config: .agentfeed/config.json');
    expect(stdout).toContain('Setup checklist');
    expect(stdout).toContain('Project: config ready');
    expect(stdout).toContain('Account: connect this terminal to AgentFeed');
    expect(stdout).toContain('First draft: collect locally without uploading');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed login');
    expect(stdout).toContain('  2. agentfeed share --dry');
    expect(stdout).toContain('  3. agentfeed status');
    expect(stderr).toBe('');
  });

  it('prints machine-readable initialization result with next actions', async () => {
    const { stdout, stderr } = await harness.runCli(['init', '--no-git-check', '--project-name', 'setup-json', '--json']);
    const output = JSON.parse(stdout) as {
      already_initialized?: boolean;
      project?: { name?: string; visibility?: string; tags?: string[] };
      root?: string;
      config_path?: string;
      backup_paths?: string[];
      setup_checklist?: Array<{ name: string; detail: string; next_action?: string }>;
      next_actions?: string[];
    };

    expect(stderr).toBe('');
    expect(output).toMatchObject({
      already_initialized: false,
      project: { name: 'setup-json', visibility: 'private', tags: [] },
      config_path: '.agentfeed/config.json',
      backup_paths: [],
      next_actions: ['agentfeed login', 'agentfeed share --dry', 'agentfeed status']
    });
    expect(output.setup_checklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Project', detail: 'config ready' }),
      expect.objectContaining({ name: 'Account', detail: 'connect this terminal to AgentFeed', next_action: 'agentfeed login' }),
      expect.objectContaining({ name: 'First draft', next_action: 'agentfeed share --dry' })
    ]));
    expect(output.root).toMatch(/agentfeed-cli-init-hook-/);
    expect(stdout).not.toContain('AgentFeed initialized');
    expect(stdout).not.toMatch(/(^|\n)Next(\n|$)/);
  });

  it('keeps existing config when init is rerun without force', async () => {
    await harness.initProject();
    const configPath = join(harness.projectDir(), '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const { stdout, stderr } = await harness.runCli(['init', '--no-git-check', '--project-name', 'overwritten']);
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(stdout).toContain('AgentFeed already initialized');
    expect(stdout).toContain('Existing AgentFeed config kept.');
    expect(stdout).toContain('Project: setup-polish');
    expect(stdout).toContain('Setup checklist');
    expect(stdout).toContain('Project: existing config kept');
    expect(stdout).toContain('Status: inspect credentials, API, and drafts');
    expect(stdout).toContain('Reinitialize: backup and recreate config only if needed');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed status');
    expect(stdout).toContain('  2. agentfeed share --dry');
    expect(stdout).toContain('agentfeed init --force');
    expect(stderr).toBe('');
    expect(saved.project.name).toBe('setup-polish');
    expect(saved.project.tags).toEqual(['custom']);
  });

  it('prints machine-readable already-initialized next actions without overwriting config', async () => {
    await harness.initProject();
    const configPath = join(harness.projectDir(), '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const { stdout, stderr } = await harness.runCli(['init', '--no-git-check', '--project-name', 'overwritten', '--json']);
    const output = JSON.parse(stdout) as { already_initialized?: boolean; project?: { name?: string; tags?: string[] }; next_actions?: string[] };
    const saved = JSON.parse(await readFile(configPath, 'utf8'));

    expect(stderr).toBe('');
    expect(output.already_initialized).toBe(true);
    expect(output.project).toMatchObject({ name: 'setup-polish', tags: ['custom'] });
    expect(output.next_actions).toEqual(['agentfeed status', 'agentfeed share --dry', 'agentfeed init --force']);
    expect(stdout).not.toContain('AgentFeed already initialized');
    expect(saved.project.name).toBe('setup-polish');
    expect(saved.project.tags).toEqual(['custom']);
  });

  it('backs up existing config when init is forced', async () => {
    await harness.initProject();
    const configPath = join(harness.projectDir(), '.agentfeed', 'config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.project.tags = ['custom'];
    await writeFile(configPath, JSON.stringify(config, null, 2));

    const { stdout, stderr } = await harness.runCli(['init', '--no-git-check', '--project-name', 'forced-setup', '--force']);
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
});
