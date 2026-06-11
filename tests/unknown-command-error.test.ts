import { describe, expect, it } from 'vitest';
import { unknownCommandError } from '../src/cli/unknown-command-error.js';

describe('unknownCommandError', () => {
  it('formats unknown command recovery from known command candidates', () => {
    // Given: a typo that closely matches a known public command.
    const error = unknownCommandError({
      command: 'statsu',
      knownCommands: ['status', 'share']
    });

    // When / Then: recovery keeps the command typo, closest command suggestion, and root help hint together.
    expect(error.message).toBe([
      'Unknown command: statsu',
      'Did you mean: agentfeed status',
      'Run: agentfeed --help'
    ].join('\n'));
  });
});
