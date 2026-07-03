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

  it('aggregates multiple test summaries from combined command output', () => {
    const output = [
      '$ npm test',
      '======= 2 failed, 10 passed, 1 skipped in 3.21s =======',
      '$ npm run e2e',
      ' Test Files  1 failed (1)',
      '      Tests  1 failed | 2 passed (3)',
      '   Duration  1.23s'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 16,
      testsPassed: 12
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

  it('aggregates multiple TAP summaries from combined command output', () => {
    const output = [
      '$ node --test unit.test.js',
      '# tests 4',
      '# suites 0',
      '# pass 3',
      '# fail 1',
      '$ node --test integration.test.js',
      '# tests 3',
      '# suites 0',
      '# pass 2',
      '# fail 1'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 7,
      testsPassed: 5
    });
  });

  it('aggregates multiple Rust test result summaries from workspace output', () => {
    const output = [
      'running 4 tests',
      'test result: ok. 3 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.02s',
      'running 3 tests',
      'test result: ok. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out; finished in 0.01s'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 7,
      testsPassed: 5
    });
  });

  it('parses go test JSON event output', () => {
    const output = [
      '{"Time":"2026-07-03T00:00:00Z","Action":"run","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Time":"2026-07-03T00:00:01Z","Action":"pass","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Time":"2026-07-03T00:00:02Z","Action":"run","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Time":"2026-07-03T00:00:03Z","Action":"fail","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Time":"2026-07-03T00:00:04Z","Action":"skip","Package":"example.test","Test":"TestLegacyImport"}',
      '{"Time":"2026-07-03T00:00:05Z","Action":"fail","Package":"example.test"}'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 3,
      testsPassed: 1
    });
  });

  it('parses Maven Surefire summary output', () => {
    const output = [
      '[INFO] -------------------------------------------------------',
      '[INFO]  T E S T S',
      '[INFO] -------------------------------------------------------',
      '[INFO] Running com.example.AgentFeedContractTest',
      '[ERROR] Tests run: 8, Failures: 1, Errors: 1, Skipped: 2, Time elapsed: 0.421 s <<< FAILURE! - in com.example.AgentFeedContractTest'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 8,
      testsPassed: 4
    });
  });

  it('parses Gradle test summary output', () => {
    const output = [
      '> Task :app:test',
      '',
      'AgentFeedContractTest > publishesWorklog FAILED',
      '    org.opentest4j.AssertionFailedError at AgentFeedContractTest.java:42',
      '',
      '12 tests completed, 2 failed, 3 skipped'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 12,
      testsPassed: 7
    });
  });

  it('parses Python unittest summary output', () => {
    const output = [
      '.......Fs',
      '----------------------------------------------------------------------',
      'Ran 9 tests in 0.123s',
      '',
      'FAILED (failures=1, skipped=1)'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 9,
      testsPassed: 7
    });
  });

  it('parses successful Python unittest output with skipped tests', () => {
    const output = [
      '.....s',
      '----------------------------------------------------------------------',
      'Ran 6 tests in 0.050s',
      '',
      'OK (skipped=1)'
    ].join('\n');

    expect(parseTestCommandOutput(output, '')).toEqual({
      testsRun: 6,
      testsPassed: 5
    });
  });

  it('returns null when command output has no reliable test count', () => {
    expect(parseTestCommandOutput('done', '')).toBeNull();
  });
});
