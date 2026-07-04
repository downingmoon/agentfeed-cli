import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createCliInitHookHarness } from './cli-init-hook-harness.js';

const harness = createCliInitHookHarness();

async function writeLegacyHookSettings(): Promise<void> {
  const settingsPath = join(harness.projectDir(), '.claude', 'settings.json');
  await mkdir(join(harness.projectDir(), '.claude'), { recursive: true });
  await writeFile(settingsPath, JSON.stringify({
    hooks: {
      Stop: [
        { matcher: '*', hooks: [{ type: 'command', command: 'sh -c "echo agentfeed Claude Code Stop hook; agentfeed collect --source claude-code"' }] }
      ]
    }
  }, null, 2));
}

describe('CLI hook setup UX', () => {
  it('rejects deprecated hook install before touching project settings', async () => {
    const failure = await harness.runCliFailure(['hook', 'install', 'claude-code']);

    expect(failure.stdout).toBe('');
    expect(failure.stderr).toContain('AgentFeed hook install is deprecated.');
    expect(failure.stderr).toContain('Run: agentfeed collect --source claude-code --explain');
    expect(failure.stderr).toContain('Run: agentfeed share --dry');
    expect(failure.stderr).toContain('Run: agentfeed hook uninstall claude-code');
    expect(failure.stderr).not.toContain('TypeError');
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('lets hook uninstall clean up from an uninitialized directory without creating settings', async () => {
    const { stdout, stderr } = await harness.runCli(['hook', 'uninstall', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook removed');
    expect(stdout).toContain('Uninstalled legacy AgentFeed Claude Code hook.');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Action: uninstall');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed status');
    expect(stdout).not.toContain('Recommended order:');
    expect(stderr).toBe('');
    expect(harness.projectFileExists('.claude/settings.json')).toBe(false);
  });

  it('prints hook uninstall summary while preserving the settings path', async () => {
    await harness.initProject();
    await writeLegacyHookSettings();

    const { stdout, stderr } = await harness.runCli(['hook', 'uninstall', 'claude-code']);

    expect(stdout).toContain('AgentFeed hook removed');
    expect(stdout).toContain('Uninstalled legacy AgentFeed Claude Code hook.');
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
    await writeLegacyHookSettings();

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
