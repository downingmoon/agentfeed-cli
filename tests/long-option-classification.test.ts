import { describe, expect, it } from 'vitest';
import { classifyLongOption } from '../src/cli/long-option-classification.js';

describe('classifyLongOption', () => {
  it('classifies value options before flags', () => {
    // Given: an option name that appears in both sets because of a malformed spec.
    const valueOptions = new Set(['--api-base-url']);
    const flags = new Set(['--api-base-url', '--help']);

    // When: the long option decision is classified.
    const result = classifyLongOption({ name: '--api-base-url', valueOptions, flags });

    // Then: value option consumption keeps the same priority as validateCommandArgs.
    expect(result).toEqual({ kind: 'value', name: '--api-base-url' });
  });

  it('classifies known flags and unknown options', () => {
    // Given: parser lookup sets for a command.
    const valueOptions = new Set(['--id']);
    const flags = new Set(['--json', '--help']);

    // When / Then: known flags and unknown options are separated without formatting errors.
    expect(classifyLongOption({ name: '--json', valueOptions, flags })).toEqual({ kind: 'flag', name: '--json' });
    expect(classifyLongOption({ name: '--missing', valueOptions, flags })).toEqual({ kind: 'unknown', name: '--missing' });
  });
});
