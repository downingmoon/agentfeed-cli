import { describe, expect, it } from 'vitest';
import { consumeLongOption } from '../src/cli/long-option-consumption.js';

describe('consumeLongOption', () => {
  it('consumes value and flag long options without constructing unknown recovery errors', () => {
    // Given: parser lookup sets and one unknown recovery error factory.
    const valueOptions = new Set(['--api-base-url']);
    const flags = new Set(['--json']);
    let unknownRecoveryCalls = 0;
    const unknownOptionError = (optionName: string): Error => {
      unknownRecoveryCalls += 1;
      return new Error(`Unknown option: ${optionName}`);
    };

    // When / Then: value and flag options return the accepted name and leave unknown recovery lazy.
    expect(consumeLongOption({
      command: 'login',
      optionToken: { name: '--api-base-url', inlineValue: 'https://api.example.test' },
      valueOptions,
      flags,
      args: ['--api-base-url=https://api.example.test'],
      index: 0,
      unknownOptionError
    })).toEqual({ optionName: '--api-base-url', nextIndex: 0 });

    expect(consumeLongOption({
      command: 'login',
      optionToken: { name: '--json', inlineValue: null },
      valueOptions,
      flags,
      args: ['--json'],
      index: 0,
      unknownOptionError
    })).toEqual({ optionName: '--json', nextIndex: 0 });

    expect(unknownRecoveryCalls).toBe(0);
  });

  it('constructs the unknown option error only after unknown classification', () => {
    // Given: a long option token that is absent from parser lookup sets.
    let recoveredName: string | null = null;
    const unknownOptionError = (optionName: string): Error => {
      recoveredName = optionName;
      return new Error(`Unknown option: ${optionName}`);
    };

    // When / Then: unknown option recovery stays owned by the caller and receives the unknown name.
    expect(() => consumeLongOption({
      command: 'share',
      optionToken: { name: '--missing', inlineValue: null },
      valueOptions: new Set(['--id']),
      flags: new Set(['--json']),
      args: ['--missing'],
      index: 0,
      unknownOptionError
    })).toThrow('Unknown option: --missing');

    expect(recoveredName).toBe('--missing');
  });
});
