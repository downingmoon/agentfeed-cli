import { describe, expect, it } from 'vitest';
import { bareDoubleDashError } from '../src/cli/bare-double-dash-error.js';

describe('bareDoubleDashError', () => {
  it('formats bare double dash recovery as an Error', () => {
    // Given: a command parser sees a bare -- token.
    const error = bareDoubleDashError('status');

    // When / Then: recovery remains an Error with the existing command-specific guidance.
    expect(error.message).toBe([
      'Unexpected argument for status: --',
      'Run: agentfeed status --help'
    ].join('\n'));
  });
});
