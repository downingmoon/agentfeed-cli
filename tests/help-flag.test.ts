import { describe, expect, it } from 'vitest';
import { hasHelpFlag } from '../src/cli/help-flag.js';

describe('hasHelpFlag', () => {
  it('detects long and short help flags in command arguments', () => {
    // Given / When / Then: command args containing help aliases are detected without treating other flags as help.
    expect(hasHelpFlag(['--json', '--help'])).toBe(true);
    expect(hasHelpFlag(['-h'])).toBe(true);
    expect(hasHelpFlag(['--json'])).toBe(false);
  });
});
