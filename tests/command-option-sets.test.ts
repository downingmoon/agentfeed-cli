import { describe, expect, it } from 'vitest';
import { buildCommandOptionSets } from '../src/cli/command-option-sets.js';

describe('buildCommandOptionSets', () => {
  it('adds help aliases to command flags while preserving command-specific flags', () => {
    // Given: a command spec with one explicit flag and one value option.
    const spec = { flags: ['--json'], valueOptions: ['--api-base-url'] };

    // When: the parser builds lookup sets for argument validation.
    const result = buildCommandOptionSets(spec);

    // Then: all boolean flags include the shared help aliases.
    expect(Array.from(result.flags)).toEqual(['--json', '--help', '-h']);
    expect(Array.from(result.valueOptions)).toEqual(['--api-base-url']);
  });

  it('builds only shared help flags when command spec omits option lists', () => {
    // Given: a command spec with no explicit flags or value options.
    const spec = {};

    // When: the parser builds lookup sets for argument validation.
    const result = buildCommandOptionSets(spec);

    // Then: help aliases remain accepted and value options stay empty.
    expect(Array.from(result.flags)).toEqual(['--help', '-h']);
    expect(Array.from(result.valueOptions)).toEqual([]);
  });
});
