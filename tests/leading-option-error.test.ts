import { describe, expect, it } from 'vitest';
import { leadingOptionError } from '../src/cli/leading-option-error.js';

describe('leadingOptionError', () => {
  it('formats command-first recovery as an Error', () => {
    // Given: a leading option that belongs after a known command.
    const error = leadingOptionError({
      option: '--json',
      args: ['status'],
      knownCommands: new Set(['status']),
      commandSpecs: { status: { flags: ['--json'] } }
    });

    // When / Then: recovery remains an Error with the existing command-first guidance.
    expect(error.message).toBe([
      'Option appears before command: --json',
      'AgentFeed uses command-first syntax: agentfeed <command> [options].',
      'Use: agentfeed status --json',
      'Run: agentfeed status --help'
    ].join('\n'));
  });
});
