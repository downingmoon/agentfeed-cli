import { describe, expect, it } from 'vitest';
import { assertNoConflictingOptions } from '../src/cli/conflict-validation.js';

describe('assertNoConflictingOptions', () => {
  it('does nothing when no conflicting pair is fully present', () => {
    // Given: a command that saw only one side of a configured conflict.
    const seenOptions = new Set(['--dry']);

    // When / Then: conflict validation preserves the accepted option set.
    expect(() => assertNoConflictingOptions({
      command: 'share',
      seenOptions,
      conflicts: [['--dry', '--yes']]
    })).not.toThrow();
  });

  it('throws the command recovery message when conflicting options are present', () => {
    // Given: a command that saw both sides of a configured conflict.
    const seenOptions = new Set(['--dry', '--yes']);

    // When / Then: conflict validation emits the existing command recovery message.
    expect(() => assertNoConflictingOptions({
      command: 'share',
      seenOptions,
      conflicts: [['--dry', '--yes']]
    })).toThrow('Conflicting options for share: --dry and --yes');
  });
});
