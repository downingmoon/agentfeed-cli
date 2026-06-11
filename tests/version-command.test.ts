import { describe, expect, it } from 'vitest';
import { versionCommandOutput } from '../src/cli/version-command.js';

describe('version command', () => {
  it('returns the plain CLI version by default', () => {
    // Given / When: version is requested without machine-readable output.
    const output = versionCommandOutput({ args: [], version: '1.2.3' });

    // Then: stdout receives only the version string.
    expect(output).toBe('1.2.3');
  });

  it('returns indented JSON when the json flag is present', () => {
    // Given / When: version is requested for machine-readable output.
    const output = versionCommandOutput({ args: ['--json'], version: '1.2.3' });

    // Then: stdout receives the stable JSON object used by release checks.
    expect(output).toBe(JSON.stringify({ version: '1.2.3' }, null, 2));
  });
});
