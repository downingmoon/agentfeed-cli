import { describe, expect, it } from 'vitest';
import { commandHelpHint, commandUsageError, conflictingOptionsError } from '../src/cli/command-recovery.js';

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

  it('formats conflicting option recovery consistently', () => {
    expect(conflictingOptionsError('share', '--dry', '--yes')).toBe([
      'Conflicting options for share: --dry and --yes',
      'Use only one of --dry or --yes.',
      'Run: agentfeed share --help'
    ].join('\n'));
  });
});
