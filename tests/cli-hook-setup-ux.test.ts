import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCliInitHookHarness } from './cli-init-hook-harness.js';

const harness = createCliInitHookHarness();

describe('CLI hook setup UX', () => {
  it('guides init before hook install when the project is not initialized', async () => {
    const failure = await harness.runCliFailure(['hook', 'install', 'claude-code']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed project is not initialized.');
    expect(failure.stderr).toContain('Run: agentfeed init');
    expect(failure.stderr).toContain('Run: git init && agentfeed init');
    expect(failure.stderr).toContain('Run: agentfeed init --no-git-check');
    expect(failure.stderr).not.toContain('TypeError');
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('lets hook uninstall clean up from an uninitialized directory without creating settings', async () => {
    const { stdout, stderr } = await harness.runCli(['hook', 'uninstall', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook removed');
    expect(stdout).toContain('Uninstalled AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Action: uninstall');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stdout).not.toContain('Recommended order:');
    expect(stderr).toBe('');
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('explains hook install dry runs without writing Claude settings', async () => {
    await harness.initProject();

    const { stdout, stderr } = await harness.runCli(['hook', 'install', 'claude-code', '--dry-run']);

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
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('prints machine-readable hook install dry-run next actions without human headings', async () => {
    await harness.initProject();

    const { stdout, stderr } = await harness.runCli(['hook', 'install', 'claude-code', '--dry-run', '--json']);
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
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('prints hook install next actions and writes the AgentFeed hook once', async () => {
    await harness.initProject();

    const { stdout, stderr } = await harness.runCli(['hook', 'install', 'claude-code']);

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

    const settings = JSON.parse(await readFile(join(harness.projectDir(), '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).toContain('collect --source claude-code');
  });

  it('prints hook uninstall summary while preserving the settings path', async () => {
    await harness.initProject();
    await harness.runCli(['hook', 'install', 'claude-code']);

    const { stdout, stderr } = await harness.runCli(['hook', 'uninstall', 'claude-code']);

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

    const settings = JSON.parse(await readFile(join(harness.projectDir(), '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).not.toContain('collect --source claude-code');
  });

  it('prints machine-readable hook uninstall next actions without human headings', async () => {
    await harness.initProject();
    await harness.runCli(['hook', 'install', 'claude-code']);

    const { stdout, stderr } = await harness.runCli(['hook', 'uninstall', 'claude-code', '--json']);
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

    const settings = JSON.parse(await readFile(join(harness.projectDir(), '.claude', 'settings.json'), 'utf8')) as Record<string, unknown>;
    expect(JSON.stringify(settings)).not.toContain('collect --source claude-code');
  });
});
