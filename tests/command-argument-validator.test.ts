import { describe, expect, it } from 'vitest';
import { validateCommandArgs } from '../src/cli/command-argument-validator.js';

describe('validateCommandArgs', () => {
  it('accepts known command options and positionals that satisfy command specs', () => {
    // Given / When / Then: valid value, flag, and nested positional forms pass parser validation.
    expect(() => validateCommandArgs('share', ['--source', 'codex', '--dry', '--note=public-safe'])).not.toThrow();
    expect(() => validateCommandArgs('completion', ['zsh'])).not.toThrow();
    expect(() => validateCommandArgs('token', ['rotate', '--browser'])).not.toThrow();
  });

  it('rejects unknown commands and unknown options with recovery context', () => {
    // Given / When / Then: command and option mistakes keep existing recovery wording.
    expect(() => validateCommandArgs('statsu', [])).toThrow('Did you mean: agentfeed status');
    expect(() => validateCommandArgs('share', ['--opne-review'])).toThrow('Did you mean: --open-review');
    expect(() => validateCommandArgs('status', ['-x'])).toThrow('Unknown option: -x');
  });

  it('rejects parser sentinels, conflicts, and invalid positionals before command execution', () => {
    // Given / When / Then: parser-only failures remain command-aware.
    expect(() => validateCommandArgs('status', ['--'])).toThrow('Unexpected argument for status: --');
    expect(() => validateCommandArgs('share', ['--dry', '--yes'])).toThrow('Conflicting options for share: --dry and --yes');
    expect(() => validateCommandArgs('token', ['rotate', 'browser'])).toThrow('Did you mean: agentfeed token rotate --browser');
  });
});
