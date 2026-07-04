import { describe, expect, it } from 'vitest';
import { bareDoubleDashArgumentMessage, completionUnexpectedArgumentMessage, conflictingOptionsMessage, optionDoesNotAcceptValueMessage, optionRequiresValueMessage, flaglessOptionSuggestionLines, helpTopicError, helpUnexpectedArgumentMessage, helpUnexpectedTokenArgumentMessage, hookUnexpectedArgumentMessage, hookUsageMessage, tokenRotateUnexpectedArgumentMessage, tokenUsageMessage, unknownCommandOptionMessage, unknownHookActionMessage, unknownTokenSubcommandMessage, unsupportedCompletionShellMessage, unsupportedHookTargetMessage } from '../src/cli/command-recovery.js';

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
      'Usage: agentfeed hook uninstall claude-code',
      'Claude Code hook install is deprecated.',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook uninstall claude-code --help'
    ].join('\n'));
  });

  it('formats unexpected hook positional recovery', () => {
    expect(hookUnexpectedArgumentMessage('extra')).toBe([
      'Unexpected argument for hook: extra',
      'Run: agentfeed hook --help'
    ].join('\n'));
  });

  it('formats bare double-dash argument recovery for command parsers', () => {
    expect(bareDoubleDashArgumentMessage('status')).toBe([
      'Unexpected argument for status: --',
      'Run: agentfeed status --help'
    ].join('\n'));
  });

  it('formats unknown hook action guidance with action suggestions', () => {
    expect(unknownHookActionMessage('instal', ['uninstall'])).toBe([
      'Unknown hook action: instal',
      'Did you mean: agentfeed hook uninstall claude-code',
      'Usage: agentfeed hook uninstall claude-code',
      'Claude Code hook install is deprecated.',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook uninstall claude-code --help'
    ].join('\n'));
    expect(unknownHookActionMessage('enable', ['uninstall'])).toBe([
      'Unknown hook action: enable',
      'Usage: agentfeed hook uninstall claude-code',
      'Claude Code hook install is deprecated.',
      'Run: agentfeed hook --help',
      'Run: agentfeed hook uninstall claude-code --help'
    ].join('\n'));
  });

  it('formats unsupported hook target guidance with Claude target suggestions only', () => {
    expect(unsupportedHookTargetMessage('uninstall', 'claude')).toBe([
      'Only legacy claude-code hook cleanup is supported.',
      'Did you mean: agentfeed hook uninstall claude-code',
      'Run: agentfeed hook uninstall claude-code --help'
    ].join('\n'));
    expect(unsupportedHookTargetMessage('uninstall', 'cursor')).toBe([
      'Only legacy claude-code hook cleanup is supported.',
      'Run: agentfeed hook uninstall claude-code --help'
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

  it('formats first matching conflicting option recovery from seen options', () => {
    const seenOptions = new Set(['--latest', '--id']);
    expect(conflictingOptionsMessage('preview', seenOptions, [['--id', '--latest']])).toBe([
      'Conflicting options for preview: --id and --latest',
      'Use only one of --id or --latest.',
      'Run: agentfeed preview --help'
    ].join('\n'));
    expect(conflictingOptionsMessage('preview', new Set(['--latest']), [['--id', '--latest']])).toBeNull();
  });

  it('formats unknown command option recovery from flag and value-option candidates', () => {
    expect(unknownCommandOptionMessage('share', '--opne-review', ['--dry', '--open-review'], ['--source'])).toBe([
      'Unknown option: --opne-review',
      'Command: agentfeed share',
      'Did you mean: --open-review',
      'Run: agentfeed share --help'
    ].join('\n'));
  });

  it('formats option value rejection recovery', () => {
    expect(optionDoesNotAcceptValueMessage('status', '--json')).toBe([
      '--json does not accept a value.',
      'Run: agentfeed status --help'
    ].join('\n'));
  });

  it('formats missing option value recovery', () => {
    expect(optionRequiresValueMessage('login', '--api-base-url')).toBe([
      '--api-base-url requires a value.',
      'Run: agentfeed login --help'
    ].join('\n'));
  });

  it('formats unexpected completion positional recovery', () => {
    expect(completionUnexpectedArgumentMessage('extra')).toBe([
      'Unexpected argument for completion: extra',
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

  it('formats unexpected token rotate positional recovery with suggestions', () => {
    expect(tokenRotateUnexpectedArgumentMessage('browser', ['Did you mean: agentfeed token rotate --browser'])).toBe([
      'Unexpected argument for token rotate: browser',
      'Did you mean: agentfeed token rotate --browser',
      'Run: agentfeed token rotate --help'
    ].join('\n'));
  });
});
