import { describe, expect, it } from 'vitest';
import { hookJsonPayload, renderHookHumanLines } from '../src/cli/hook-output.js';

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
  it('builds hook uninstall JSON payload for legacy cleanup', () => {
    // Given: a hook uninstall result.
    const payload = hookJsonPayload(uninstallInput);

    // Then: uninstall JSON keeps cleanup details and next action.
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

  it('renders hook uninstall human output without install guidance', () => {
    // Given: a hook uninstall outcome.
    const text = renderHookHumanLines(uninstallInput, plainStyle).join('\n');

    // Then: uninstall output preserves cleanup wording and omits install-only details.
    expect(text).toContain('AgentFeed hook removed');
    expect(text).toContain('Uninstalled legacy AgentFeed Claude Code hook.');
    expect(text).toContain('Action: uninstall');
    expect(text).toContain('Scope: project');
    expect(text).toContain('Settings: /tmp/project/.claude/settings.json');
    expect(text).toContain('Backup: /tmp/project/.agentfeed/backups/claude-settings.20260612050000.json');
    expect(text).toContain('  agentfeed status');
    expect(text).not.toContain('Dry run:');
    expect(text).not.toContain('Recommended order:');
    expect(text).not.toContain('agentfeed hook install claude-code');
  });
});
