import { describe, expect, it } from 'vitest';
import { consumeFlagOption } from '../src/cli/option-consumption.js';

describe('consumeFlagOption', () => {
  it('accepts a flag without an inline value', () => {
    expect(consumeFlagOption({ command: 'status', optionName: '--json', inlineValue: null })).toEqual({ accepted: true });
  });

  it('rejects a flag with an inline value', () => {
    expect(() => consumeFlagOption({ command: 'status', optionName: '--json', inlineValue: 'true' })).toThrow('--json does not accept a value.');
  });
});
