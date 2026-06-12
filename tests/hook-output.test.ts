import { describe, expect, it } from 'vitest';
import { hookJsonPayload, renderHookHumanLines } from '../src/cli/hook-output.js';

const installDryRunInput = {
  action: 'install',
  scope: 'project',
  dryRun: true,
  settingsPath: '/tmp/project/.claude/settings.json',
  backupPath: null
} as const;

const installInput = {
  action: 'install',
  scope: 'global',
  dryRun: false,
  settingsPath: '/Users/example/.claude/settings.json',
  backupPath: '/Users/example/.claude/settings.json.agentfeed-backup.20260612050000'
} as const;

const uninstallInput = {
  action: 'uninstall',
  scope: 'project',
  settingsPath: '/tmp/project/.claude/settings.json',
  backupPath: '/tmp/project/.agentfeed/backups/claude-settings.20260612050000.json'
} as const;

const plainStyle = {
  heading: (text: string) => text,
  section: (text: string) => text,
  command: (text: string) => text
} as const;

describe('hook output helpers', () => {
  it('builds hook install JSON payload with dry-run next actions', () => {
    // Given: a dry-run hook install result.
    const payload = hookJsonPayload(installDryRunInput);

    // Then: the machine-readable contract preserves dry_run and dry-run recovery action.
    expect(payload).toEqual({
      target: 'claude-code',
      action: 'install',
      scope: 'project',
      dry_run: true,
      settings_path: '/tmp/project/.claude/settings.json',
      backup_path: null,
      next_actions: ['agentfeed hook install claude-code']
    });
  });

  it('builds hook uninstall JSON payload without install-only dry-run fields', () => {
    // Given: a hook uninstall result.
    const payload = hookJsonPayload(uninstallInput);

    // Then: uninstall JSON keeps the existing public shape and next action.
    expect(payload).toEqual({
      target: 'claude-code',
      action: 'uninstall',
      scope: 'project',
      settings_path: '/tmp/project/.claude/settings.json',
      backup_path: '/tmp/project/.agentfeed/backups/claude-settings.20260612050000.json',
      next_actions: ['agentfeed status']
    });
    expect(Object.keys(payload)).not.toContain('dry_run');
  });

  it('renders hook install dry-run and installed human output with guided next commands', () => {
    // Given: dry-run and installed hook outcomes.
    const dryRun = renderHookHumanLines(installDryRunInput, plainStyle).join('\n');
    const installed = renderHookHumanLines(installInput, plainStyle).join('\n');

    // Then: each output preserves the state-specific heading, summary, backup, and next actions.
    expect(dryRun).toContain('AgentFeed hook dry run');
    expect(dryRun).toContain('Would install AgentFeed Claude Code hook.');
    expect(dryRun).toContain('Dry run: yes');
    expect(dryRun).toContain('Settings: /tmp/project/.claude/settings.json');
    expect(dryRun).toContain('  agentfeed hook install claude-code');
    expect(dryRun).not.toContain('Recommended order:');
    expect(installed).toContain('AgentFeed hook installed');
    expect(installed).toContain('Installed AgentFeed Claude Code hook.');
    expect(installed).toContain('Scope: global');
    expect(installed).toContain('Dry run: no');
    expect(installed).toContain('Backup: /Users/example/.claude/settings.json.agentfeed-backup.20260612050000');
    expect(installed).toContain('Recommended order:');
    expect(installed).toContain('1. agentfeed status');
    expect(installed).toContain('2. agentfeed share --dry');
  });

  it('renders hook uninstall human output without dry-run summary', () => {
    // Given: a hook uninstall outcome.
    const text = renderHookHumanLines(uninstallInput, plainStyle).join('\n');

    // Then: uninstall output preserves existing wording and omits install-only details.
    expect(text).toContain('AgentFeed hook removed');
    expect(text).toContain('Uninstalled AgentFeed Claude Code hook.');
    expect(text).toContain('Action: uninstall');
    expect(text).toContain('Scope: project');
    expect(text).toContain('Settings: /tmp/project/.claude/settings.json');
    expect(text).toContain('Backup: /tmp/project/.agentfeed/backups/claude-settings.20260612050000.json');
    expect(text).toContain('  agentfeed status');
    expect(text).not.toContain('Dry run:');
    expect(text).not.toContain('Recommended order:');
  });
});
