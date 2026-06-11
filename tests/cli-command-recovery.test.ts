import { describe, expect, it } from 'vitest';
import { commandHelpHint, commandUsageError, conflictingOptionsError, unknownCommandErrorMessage, unknownOptionErrorMessage } from '../src/cli/command-recovery.js';

describe('CLI command recovery messages', () => {
  it('returns command-specific help hints', () => {
    expect(commandHelpHint('token')).toBe('Run: agentfeed token rotate --help');
    expect(commandHelpHint('help')).toBe('Run: agentfeed help --help');
    expect(commandHelpHint('share')).toBe('Run: agentfeed share --help');
  });

  it('formats usage errors with optional suggestions and the command help hint', () => {
    expect(commandUsageError('Unexpected argument for preview: latest', 'preview', [
      'Did you mean: agentfeed preview --latest'
    ])).toBe([
      'Unexpected argument for preview: latest',
      'Did you mean: agentfeed preview --latest',
      'Run: agentfeed preview --help'
    ].join('\n'));
  });

  it('formats unknown command recovery with closest public command suggestions', () => {
    expect(unknownCommandErrorMessage('statsu', ['status', 'share', 'scan'])).toBe([
      'Unknown command: statsu',
      'Did you mean: agentfeed status',
      'Run: agentfeed --help'
    ].join('\n'));
    expect(unknownCommandErrorMessage('xyz', ['status', 'share', 'scan'])).toBe([
      'Unknown command: xyz',
      'Run: agentfeed --help'
    ].join('\n'));
  });

  it('formats unknown option recovery with closest option suggestions', () => {
    expect(unknownOptionErrorMessage('share', '--opne-review', ['--open-review', '--no-open-review', '--json'])).toBe([
      'Unknown option: --opne-review',
      'Command: agentfeed share',
      'Did you mean: --open-review',
      'Run: agentfeed share --help'
    ].join('\n'));
    expect(unknownOptionErrorMessage('share', '--totally-unknown', ['--open-review', '--no-open-review', '--json'])).toBe([
      'Unknown option: --totally-unknown',
      'Command: agentfeed share',
      'Run: agentfeed share --help'
    ].join('\n'));
  });

  it('formats conflicting option recovery consistently', () => {
    expect(conflictingOptionsError('share', '--dry', '--yes')).toBe([
      'Conflicting options for share: --dry and --yes',
      'Use only one of --dry or --yes.',
      'Run: agentfeed share --help'
    ].join('\n'));
  });
});
