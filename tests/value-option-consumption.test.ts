import { describe, expect, it } from 'vitest';
import { consumeValueOption } from '../src/cli/value-option-consumption.js';

describe('consumeValueOption', () => {
  it('keeps the current index when the value is inline', () => {
    expect(consumeValueOption({
      command: 'login',
      optionName: '--api-base-url',
      inlineValue: 'https://api.example.test',
      args: ['--api-base-url=https://api.example.test'],
      index: 0
    })).toEqual({ nextIndex: 0 });
  });

  it('advances past the following token when the value is separate', () => {
    expect(consumeValueOption({
      command: 'login',
      optionName: '--api-base-url',
      inlineValue: null,
      args: ['--api-base-url', 'https://api.example.test'],
      index: 0
    })).toEqual({ nextIndex: 1 });
  });

  it('rejects missing, empty inline, and flag-shaped values', () => {
    const baseInput = {
      command: 'login',
      optionName: '--api-base-url',
      index: 0
    };

    expect(() => consumeValueOption({ ...baseInput, inlineValue: '', args: ['--api-base-url='] })).toThrow('--api-base-url requires a value.');
    expect(() => consumeValueOption({ ...baseInput, inlineValue: null, args: ['--api-base-url'] })).toThrow('--api-base-url requires a value.');
    expect(() => consumeValueOption({ ...baseInput, inlineValue: null, args: ['--api-base-url', '--json'] })).toThrow('--api-base-url requires a value.');
  });
});
