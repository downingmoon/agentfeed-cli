import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { collectAgentSessionMetrics } from '../src/collectors/agent-session.js';
import { codexSessionRows, createCodexFixture, type CodexFixture, writeJsonl } from './session-collector-codex-command-helpers.js';

let fixture: CodexFixture;
let dir: string;

beforeEach(async () => {
  fixture = await createCodexFixture();
  dir = fixture.dir;
});

afterEach(async () => {
  await fixture.cleanup();
});

describe('Codex session collector command metrics', () => {
  it('uses parsed test output counts when Codex shell output includes a summary', async () => {
    const sessionFile = join(dir, 'codex-test-output-counts.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-test-output-counts',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'test-summary', cmd: 'npm test', output: 'Process exited with code 1\n======= 2 failed, 10 passed, 1 skipped in 3.21s =======' }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(13);
    expect(metrics?.tests_passed).toBe(10);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('does not treat non-test command failures as failed tests', async () => {
    const sessionFile = join(dir, 'codex-failed-shell.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-session-commands',
      cwd: dir,
      steps: [
        { kind: 'shell', callId: 'test-ok', cmd: 'npm test', output: 'Process exited with code 0\nPASS tests/api.test.ts\nTest Files: 0 failed, 1 passed, 1 total' },
        { kind: 'shell', callId: 'lint-fail', cmd: 'git diff --check', output: 'Process exited with code 1\nwhitespace error' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.tests_run).toBe(1);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('counts Codex failed function call output status as a failed command', async () => {
    const sessionFile = join(dir, 'codex-failed-output-status.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-failed-output-status',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'status-fail', cmd: "cat > src/failed-status.ts <<'EOF'\nexport const failed = true;\nEOF", output: '', status: 'failed' }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
    expect(metrics?.changed_files).toEqual([]);
    expect(metrics?.files_changed).toBeNull();
    expect(metrics?.lines_added).toBeNull();
  });

  it('recognizes common wrapped test commands in Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-wrapped-test-commands.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-wrapped-test-commands',
      cwd: dir,
      steps: [
        { kind: 'shell', callId: 'uv-pytest', cmd: 'uv run --with pytest pytest tests -q', output: 'Process exited with code 0\n24 passed' },
        { kind: 'shell', callId: 'python-pytest', cmd: 'python -m pytest tests/test_contracts.py -q', output: 'Process exited with code 1\nFAILED tests/test_contracts.py' },
        { kind: 'shell', callId: 'make-test', cmd: 'make test', output: 'Process exited with code 0\nPASS' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(3);
    expect(metrics?.tests_run).toBe(26);
    expect(metrics?.tests_passed).toBe(25);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts Maven Surefire summaries from Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-maven-surefire-summary.jsonl');
    const mavenOutput = '[ERROR] Tests run: 8, Failures: 1, Errors: 1, Skipped: 2, Time elapsed: 0.421 s <<< FAILURE!';
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-maven-surefire-summary',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'maven-test', cmd: 'mvn test', output: mavenOutput }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(8);
    expect(metrics?.tests_passed).toBe(4);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts .NET test summaries from Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-dotnet-summary.jsonl');
    const dotnetOutput = 'Failed!  - Failed:     1, Passed:     3, Skipped:     1, Total:     5, Duration: 1 s - AgentFeed.Tests.dll (net8.0)';
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-dotnet-summary',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'dotnet-test', cmd: 'dotnet test', output: dotnetOutput }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(5);
    expect(metrics?.tests_passed).toBe(3);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts Gradle summaries from Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-gradle-summary.jsonl');
    const gradleOutput = ['> Task :app:test FAILED', '12 tests completed, 2 failed, 3 skipped'].join('\n');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-gradle-summary',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'gradle-test', cmd: './gradlew test', output: gradleOutput }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(12);
    expect(metrics?.tests_passed).toBe(7);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts Python unittest summaries from Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-python-unittest-summary.jsonl');
    const unittestOutput = ['.......Fs', '----------------------------------------------------------------------', 'Ran 9 tests in 0.123s', '', 'FAILED (failures=1, skipped=1)'].join('\n');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-python-unittest-summary',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'python-unittest', cmd: 'python -m unittest discover', output: unittestOutput }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(9);
    expect(metrics?.tests_passed).toBe(7);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('extracts go test JSON events and marks failed events as failed commands', async () => {
    const sessionFile = join(dir, 'codex-go-json-test-events.jsonl');
    const goJsonOutput = [
      '{"Action":"run","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Action":"pass","Package":"example.test","Test":"TestCreateDraft"}',
      '{"Action":"run","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Action":"fail","Package":"example.test","Test":"TestPublishDraft"}',
      '{"Action":"skip","Package":"example.test","Test":"TestLegacyImport"}',
      '{"Action":"fail","Package":"example.test"}'
    ].join('\n');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-go-json-test-events',
      cwd: dir,
      steps: [{ kind: 'shell', callId: 'go-json-test', cmd: 'go test -json ./...', output: goJsonOutput }]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(1);
    expect(metrics?.tests_run).toBe(3);
    expect(metrics?.tests_passed).toBe(1);
    expect(metrics?.failed_commands).toBe(1);
  });

  it('recognizes direct test runner commands in Codex shell calls', async () => {
    const sessionFile = join(dir, 'codex-direct-test-commands.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-direct-test-commands',
      cwd: dir,
      steps: [
        { kind: 'shell', callId: 'pytest-direct', cmd: 'pytest tests -q', output: 'Process exited with code 0\n24 passed' },
        { kind: 'shell', callId: 'vitest-direct', cmd: 'vitest run', output: 'Process exited with code 0\nTest Files: 0 failed, 4 passed, 4 total\nTests: 0 failed, 4 passed, 4 total' },
        { kind: 'shell', callId: 'playwright-direct', cmd: 'playwright test', output: 'Process exited with code 1\n1 failed, 2 passed' },
        { kind: 'shell', callId: 'node-test-direct', cmd: 'node --test unit.test.js && node --test integration.test.js', output: 'Process exited with code 1\n# tests 4\n# suites 0\n# pass 3\n# fail 1\n# tests 3\n# suites 0\n# pass 2\n# fail 1' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(4);
    expect(metrics?.tests_run).toBe(38);
    expect(metrics?.tests_passed).toBe(35);
    expect(metrics?.failed_commands).toBe(2);
  });

  it('does not count browser test setup commands as executed tests', async () => {
    const sessionFile = join(dir, 'codex-browser-test-setup-commands.jsonl');
    await writeJsonl(sessionFile, codexSessionRows({
      id: 'codex-browser-test-setup-commands',
      cwd: dir,
      steps: [
        { kind: 'shell', callId: 'playwright-install', cmd: 'playwright install --with-deps', output: 'Process exited with code 0\nBrowsers installed' },
        { kind: 'shell', callId: 'cypress-open', cmd: 'npx cypress open', output: 'Process exited with code 0\nOpening Cypress' },
        { kind: 'shell', callId: 'uv-playwright-install', cmd: 'uv run playwright install chromium', output: 'Process exited with code 0\nChromium installed' },
        { kind: 'shell', callId: 'uv-cypress-open', cmd: 'uv run cypress open', output: 'Process exited with code 0\nOpening Cypress' }
      ]
    }));

    const metrics = await collectAgentSessionMetrics({ cwd: dir, source: 'codex', sessionFile });

    expect(metrics?.commands_run).toBe(4);
    expect(metrics?.tests_run).toBeNull();
    expect(metrics?.tests_passed).toBeNull();
    expect(metrics?.failed_commands).toBeNull();
  });
});
