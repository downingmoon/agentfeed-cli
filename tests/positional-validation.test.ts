import { describe, expect, it } from 'vitest';
import { assertValidPositionals } from '../src/cli/positional-validation.js';

describe('assertValidPositionals', () => {
  it('does nothing when no validator exists or the validator accepts the arguments', () => {
    expect(() => assertValidPositionals({ positionals: ['allowed'] })).not.toThrow();
    expect(() => assertValidPositionals({
      positionals: ['allowed'],
      validatePositionals: () => null
    })).not.toThrow();
  });

  it('throws the validator recovery message when positionals are invalid', () => {
    expect(() => assertValidPositionals({
      positionals: ['extra'],
      validatePositionals: (positionals) => `Unexpected argument: ${positionals[0]}`
    })).toThrow('Unexpected argument: extra');
  });
});
