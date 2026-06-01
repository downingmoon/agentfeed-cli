import { describe, expect, it } from 'vitest';
import { parseTestCommandOutput } from '../src/collectors/test-command.js';

describe('configured test command output parser', () => {
  it('parses pytest summary counts instead of treating the command as one test', () => {
    expect(parseTestCommandOutput('======= 2 failed, 10 passed, 1 skipped in 3.21s =======', '')).toEqual({
      testsRun: 13,
      testsPassed: 10
    });
  });

  it('parses vitest style test summary lines', () => {
    const output = [
      ' Test Files  1 failed (1)',
      '      Tests  1 failed | 2 passed (3)',
      '   Duration  1.23s'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 3,
      testsPassed: 2
    });
  });

  it('parses TAP summaries from node test output', () => {
    const output = [
      '# tests 4',
      '# suites 0',
      '# pass 3',
      '# fail 1',
      '# cancelled 0'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 4,
      testsPassed: 3
    });
  });

  it('returns null when command output has no reliable test count', () => {
    expect(parseTestCommandOutput('done', '')).toBeNull();
  });
});
