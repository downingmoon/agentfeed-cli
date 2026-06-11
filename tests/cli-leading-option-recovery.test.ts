import { describe, expect, it } from 'vitest';
import { leadingOptionErrorMessage } from '../src/cli/leading-option-recovery.js';

const knownCommands = new Set(['commands', 'collect', 'login', 'status']);
const commandSpecs = {
  commands: { flags: ['--json'] },
  collect: { flags: ['--dry', '--dry-run'], valueOptions: ['--source', '--session-file'] },
  login: { flags: ['--no-open'], valueOptions: ['--api-base-url'] },
  status: { flags: ['--json'] }
};

describe('CLI leading option recovery messages', () => {
  it('formats command-first examples when no later command accepts the leading option', () => {
    expect(leadingOptionErrorMessage({ option: '--dry', args: [], knownCommands, commandSpecs })).toBe([
      'Option appears before command: --dry',
      'AgentFeed uses command-first syntax: agentfeed <command> [options].',
      'Try: agentfeed share --dry',
      'Try: agentfeed collect --dry-run --explain',
      'Run: agentfeed --help'
    ].join('\n'));
  });

  it('formats a reordered command when a later command accepts the leading value option', () => {
    expect(leadingOptionErrorMessage({
      option: '--api-base-url',
      args: ['http://localhost:8001/v1', 'login'],
      knownCommands,
      commandSpecs
    })).toBe([
      'Option appears before command: --api-base-url',
      'AgentFeed uses command-first syntax: agentfeed <command> [options].',
      'Use: agentfeed login --api-base-url http://localhost:8001/v1',
      'Run: agentfeed login --help'
    ].join('\n'));
  });

  it('preserves inline leading option values in reordered commands', () => {
    expect(leadingOptionErrorMessage({
      option: '--api-base-url=http://localhost:8001/v1',
      args: ['login'],
      knownCommands,
      commandSpecs
    })).toContain('Use: agentfeed login --api-base-url=http://localhost:8001/v1');
  });
});
