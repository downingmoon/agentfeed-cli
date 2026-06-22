import { describe, expect, it } from 'vitest';
import { useCliScanFixture } from './cli-scan-helpers.js';

const fixture = useCliScanFixture();

describe('scan CLI command path output', () => {
  it('makes path scans explicit that no draft was modified', () => {
    const stdout = fixture.runScan([
      '--path',
      fixture.dir()
    ]);

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain('Target: path ');
    expect(stdout).toContain('Mode: inspect only');
    expect(stdout).toContain('Path scan: inspect only; no draft was modified.');
    expect(stdout).not.toContain('Dry run: draft not modified.');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('agentfeed collect --explain');
  });
});
