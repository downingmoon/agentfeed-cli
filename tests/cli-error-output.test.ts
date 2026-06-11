import { describe, expect, it } from 'vitest';
import { errorCodeFromMessage, jsonErrorFromMessage } from '../src/cli/error-output.js';

describe('CLI error JSON output', () => {
  it('derives stable error codes from the first message line', () => {
    expect(errorCodeFromMessage('Unknown option: --bogus\nRun: agentfeed status --help')).toBe('unknown_option_bogus');
    expect(errorCodeFromMessage('***')).toBe('agentfeed_error');
  });

  it('extracts details, next actions, and suggestions without duplicates', () => {
    expect(jsonErrorFromMessage([
      'Unexpected argument for preview: latest',
      'AgentFeed uses command-first syntax: agentfeed <command> [options].',
      'Run: agentfeed preview --help',
      'Run: agentfeed preview --help',
      'Use: agentfeed preview --latest',
      'Try: agentfeed commands',
      'Did you mean: agentfeed preview --latest',
      'Did you mean: agentfeed preview --latest'
    ].join('\n'))).toEqual({
      error: {
        code: 'unexpected_argument_for_preview_latest',
        message: 'Unexpected argument for preview: latest',
        details: [
          'AgentFeed uses command-first syntax: agentfeed <command> [options].',
          'Run: agentfeed preview --help',
          'Run: agentfeed preview --help',
          'Use: agentfeed preview --latest',
          'Try: agentfeed commands',
          'Did you mean: agentfeed preview --latest',
          'Did you mean: agentfeed preview --latest'
        ]
      },
      next_actions: [
        'agentfeed preview --help',
        'agentfeed preview --latest',
        'agentfeed commands'
      ],
      suggestions: ['agentfeed preview --latest']
    });
  });

  it('returns the default structured error for blank messages', () => {
    expect(jsonErrorFromMessage('')).toEqual({
      error: { code: 'agentfeed_error', message: 'AgentFeed command failed.', details: [] },
      next_actions: [],
      suggestions: []
    });
  });
});
