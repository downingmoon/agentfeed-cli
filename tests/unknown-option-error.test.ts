import { describe, expect, it } from 'vitest';
import { unknownOptionError } from '../src/cli/unknown-option-error.js';

describe('unknownOptionError', () => {
  it('formats command option recovery from parser option sets', () => {
    // Given: a command option name that closely matches a known flag.
    const error = unknownOptionError({
      command: 'share',
      optionName: '--opne-review',
      optionSpec: {
        flags: ['--open-review'],
        valueOptions: ['--source']
      }
    });

    // When / Then: recovery keeps the command context, closest suggestion, and help hint together.
    expect(error.message).toBe([
      'Unknown option: --opne-review',
      'Command: agentfeed share',
      'Did you mean: --open-review',
      'Run: agentfeed share --help'
    ].join('\n'));
  });
});
