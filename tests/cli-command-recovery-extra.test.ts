import { describe, expect, it } from 'vitest';
import { flaglessOptionSuggestionLines, helpTopicError, helpUnexpectedArgumentMessage, helpUnexpectedTokenArgumentMessage, hookUsageMessage, tokenUsageMessage, unknownHookActionMessage, unknownTokenSubcommandMessage, unsupportedCompletionShellMessage, unsupportedHookTargetMessage } from '../src/cli/command-recovery.js';

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

  it('formats unexpected help positional recovery', () => {
    expect(helpUnexpectedArgumentMessage('extra')).toBe([
      'Unexpected argument for help: extra',
      'Run: agentfeed help --help'
    ].join('\n'));
    expect(helpUnexpectedTokenArgumentMessage('extra')).toBe([
      'Unexpected argument for help token: extra',
      'Run: agentfeed help --help'
    ].join('\n'));
  });

  it('formats hook usage guidance', () => {
    expect(hookUsageMessage()).toBe([
      'Usage: agentfeed hook install|uninstall claude-code',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook install claude-code --dry-run'
    ].join('\n'));
  });

  it('formats unknown hook action guidance with action suggestions', () => {
    expect(unknownHookActionMessage('instal', ['install', 'uninstall'])).toBe([
      'Unknown hook action: instal',
      'Did you mean: agentfeed hook install claude-code',
      'Usage: agentfeed hook install|uninstall claude-code',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook install claude-code --dry-run'
    ].join('\n'));
    expect(unknownHookActionMessage('enable', ['install', 'uninstall'])).toBe([
      'Unknown hook action: enable',
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

  it('formats flagless option suggestions from supported long flags only', () => {
    expect(flaglessOptionSuggestionLines('share', ['yes', 'open-review'], ['--yes', '--open-review', '-y'])).toEqual([
      'Did you mean: agentfeed share --yes --open-review'
    ]);
    expect(flaglessOptionSuggestionLines('token', ['yes'], ['--yes'], ['rotate'])).toEqual([
      'Did you mean: agentfeed token rotate --yes'
    ]);
    expect(flaglessOptionSuggestionLines('share', ['yes', 'unknown'], ['--yes', '--open-review'])).toEqual([]);
    expect(flaglessOptionSuggestionLines('share', [], ['--yes', '--open-review'])).toEqual([]);
  });

  it('formats token alias usage and unknown subcommand recovery', () => {
    expect(tokenUsageMessage()).toBe([
      'Usage: agentfeed token rotate',
      'Run: agentfeed token rotate --help'
    ].join('\n'));
    expect(unknownTokenSubcommandMessage('rotat')).toBe([
      'Unknown token subcommand: rotat',
      'Run: agentfeed token rotate --help'
    ].join('\n'));
  });
});
