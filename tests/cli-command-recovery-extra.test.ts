import { describe, expect, it } from 'vitest';
import { helpTopicError, hookUsageMessage, unsupportedCompletionShellMessage, unsupportedHookTargetMessage } from '../src/cli/command-recovery.js';

describe('CLI help and hook recovery messages', () => {
  it('formats help topic recovery with closest known topic suggestions', () => {
    expect(helpTopicError('statsu', ['status', 'share', 'scan'])).toBe([
      'Unknown help topic: statsu',
      'Did you mean: agentfeed help status',
      'Run: agentfeed help'
    ].join('\n'));
    expect(helpTopicError('totally-unknown', ['status', 'share', 'scan'])).toBe([
      'Unknown help topic: totally-unknown',
      'Run: agentfeed help'
    ].join('\n'));
  });

  it('formats hook usage guidance', () => {
    expect(hookUsageMessage()).toBe([
      'Usage: agentfeed hook install|uninstall claude-code',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook install claude-code --dry-run'
    ].join('\n'));
  });

  it('formats unsupported hook target guidance with Claude target suggestions only', () => {
    expect(unsupportedHookTargetMessage('install', 'claude')).toBe([
      'Only claude-code hooks are supported.',
      'Did you mean: agentfeed hook install claude-code',
      'Run: agentfeed hook install claude-code --help'
    ].join('\n'));
    expect(unsupportedHookTargetMessage('install', 'cursor')).toBe([
      'Only claude-code hooks are supported.',
      'Run: agentfeed hook install claude-code --help'
    ].join('\n'));
  });

  it('formats unsupported completion shell guidance with closest shell suggestions', () => {
    expect(unsupportedCompletionShellMessage('zhs', ['zsh', 'bash', 'fish'])).toBe([
      'Unsupported completion shell: zhs',
      'Supported shells: zsh, bash, fish',
      'Did you mean: agentfeed completion zsh',
      'Run: agentfeed completion --help'
    ].join('\n'));
    expect(unsupportedCompletionShellMessage('powershell', ['zsh', 'bash', 'fish'])).toBe([
      'Unsupported completion shell: powershell',
      'Supported shells: zsh, bash, fish',
      'Run: agentfeed completion --help'
    ].join('\n'));
  });
});
