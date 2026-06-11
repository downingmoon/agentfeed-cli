import { describe, expect, it } from 'vitest';
import { consumeLongOption } from '../src/cli/long-option-consumption.js';

describe('consumeLongOption', () => {
  it('consumes value and flag long options with the accepted option name', () => {
    // Given: parser lookup sets and one value option token.
    const valueOptions = new Set(['--api-base-url']);
    const flags = new Set(['--json']);

    // When / Then: value and flag options return the accepted name and next index.
    expect(consumeLongOption({
      command: 'login',
      optionToken: { name: '--api-base-url', inlineValue: 'https://api.example.test' },
      valueOptions,
      flags,
      args: ['--api-base-url=https://api.example.test'],
      index: 0,
      unknownOptionError: new Error('unknown')
    })).toEqual({ optionName: '--api-base-url', nextIndex: 0 });

    expect(consumeLongOption({
      command: 'login',
      optionToken: { name: '--json', inlineValue: null },
      valueOptions,
      flags,
      args: ['--json'],
      index: 0,
      unknownOptionError: new Error('unknown')
    })).toEqual({ optionName: '--json', nextIndex: 0 });
  });

  it('throws the provided unknown option error', () => {
    // Given: a long option token that is absent from parser lookup sets.
    const error = new Error('Unknown option: --missing');

    // When / Then: unknown option recovery stays owned by the caller.
    expect(() => consumeLongOption({
      command: 'share',
      optionToken: { name: '--missing', inlineValue: null },
      valueOptions: new Set(['--id']),
      flags: new Set(['--json']),
      args: ['--missing'],
      index: 0,
      unknownOptionError: error
    })).toThrow('Unknown option: --missing');
  });
});
