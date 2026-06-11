import { describe, expect, it } from 'vitest';
import { consumeFlagOption, consumeShortOption } from '../src/cli/option-consumption.js';

describe('consumeFlagOption', () => {
  it('accepts a flag without an inline value', () => {
    expect(consumeFlagOption({ command: 'status', optionName: '--json', inlineValue: null })).toEqual({ accepted: true });
  });

  it('rejects a flag with an inline value', () => {
    expect(() => consumeFlagOption({ command: 'status', optionName: '--json', inlineValue: 'true' })).toThrow('--json does not accept a value.');
  });
});

describe('consumeShortOption', () => {
  it('accepts a known short flag', () => {
    expect(consumeShortOption({ optionName: '-h', flags: new Set(['-h']), unknownOptionError: new Error('unknown') })).toEqual({ optionName: '-h' });
  });

  it('rejects an unknown short option with the provided recovery error', () => {
    expect(() => consumeShortOption({ optionName: '-x', flags: new Set(['-h']), unknownOptionError: new Error('Unknown option: -x') })).toThrow('Unknown option: -x');
  });
});
