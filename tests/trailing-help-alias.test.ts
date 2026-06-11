import { describe, expect, it } from 'vitest';
import { isTrailingHelpAlias } from '../src/cli/trailing-help-alias.js';

describe('isTrailingHelpAlias', () => {
  it('detects command help aliases and token rotate help aliases', () => {
    // Given / When / Then: supported trailing help aliases are accepted without broadening unrelated args.
    expect(isTrailingHelpAlias({ command: 'status', args: ['help'] })).toBe(true);
    expect(isTrailingHelpAlias({ command: 'token', args: ['rotate', 'help'] })).toBe(true);
    expect(isTrailingHelpAlias({ command: 'token', args: ['help'] })).toBe(true);
    expect(isTrailingHelpAlias({ command: 'token', args: ['rotate'] })).toBe(false);
    expect(isTrailingHelpAlias({ command: 'status', args: ['extra', 'help'] })).toBe(false);
  });
});
