type TestCommandCounts = {
  readonly testsRun: number;
  readonly testsPassed: number;
};

function countStatusPairs(text: string): Record<string, number> {
  const counts: Record<string, number> = {};
  const normalized = text.replace(/[()]/g, ' ');
  const pattern = /\b(\d+)\s+(passed|pass|passing|failed|fail|failing|errors?|skipped|skip|pending|todo|xfailed|xpassed)\b/gi;
  for (const match of normalized.matchAll(pattern)) {
    const value = Number.parseInt(match[1], 10);
    if (!Number.isFinite(value)) continue;
    const status = match[2].toLowerCase();
    const key = status.startsWith('pass') ? 'passed'
      : status.startsWith('fail') ? 'failed'
        : status.startsWith('error') ? 'failed'
          : status.startsWith('skip') ? 'skipped'
            : status;
    counts[key] = (counts[key] ?? 0) + value;
  }
  return counts;
}

function countsFromStatusSummary(text: string): TestCommandCounts | null {
  const counts = countStatusPairs(text);
  const statuses = Object.keys(counts);
  if (!statuses.length) return null;
  const passed = counts.passed ?? 0;
  const failed = counts.failed ?? 0;
  const skipped = counts.skipped ?? 0;
  const pending = counts.pending ?? 0;
  const todo = counts.todo ?? 0;
  const xfailed = counts.xfailed ?? 0;
  const xpassed = counts.xpassed ?? 0;
  const totalMatch = /\b(\d+)\s+total\b/i.exec(text);
  const parenthesizedTotalMatch = /\((\d+)\)\s*$/i.exec(text.trim());
  const explicitTotal = totalMatch ?? parenthesizedTotalMatch;
  const testsRun = explicitTotal
    ? Number.parseInt(explicitTotal[1], 10)
    : passed + failed + skipped + pending + todo + xfailed + xpassed;
  if (!Number.isFinite(testsRun) || testsRun <= 0) return null;
  return {
    testsRun,
    testsPassed: passed
  };
}

function parseTapSummary(text: string): TestCommandCounts | null {
  const testMatches = [...text.matchAll(/(?:^|\n)\s*#?\s*tests\s+(\d+)\b/gi)];
  const passMatches = [...text.matchAll(/(?:^|\n)\s*#?\s*pass(?:ed)?\s+(\d+)\b/gi)];
  if (!testMatches.length || testMatches.length !== passMatches.length) return null;
  let testsRun = 0;
  let testsPassed = 0;
  for (const [index, testMatch] of testMatches.entries()) {
    const passMatch = passMatches[index];
    if (!passMatch) return null;
    const testCount = Number.parseInt(testMatch[1], 10);
    const passCount = Number.parseInt(passMatch[1], 10);
    if (!Number.isFinite(testCount) || !Number.isFinite(passCount) || testCount <= 0) return null;
    testsRun += testCount;
    testsPassed += Math.min(passCount, testCount);
  }
  return {
    testsRun,
    testsPassed
  };
}

function stringField(record: object, key: string): string | null {
  const value: unknown = Reflect.get(record, key);
  return typeof value === 'string' ? value : null;
}

function parseGoTestJsonSummary(text: string): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  const completedTests = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('{')) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      if (error instanceof SyntaxError) continue;
      throw error;
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
    const action = stringField(parsed, 'Action')?.toLowerCase();
    const test = stringField(parsed, 'Test');
    if (!test || (action !== 'pass' && action !== 'fail' && action !== 'skip')) continue;
    const packageName = stringField(parsed, 'Package') ?? '';
    const key = `${packageName}\0${test}`;
    if (completedTests.has(key)) continue;
    completedTests.add(key);
    testsRun += 1;
    if (action === 'pass') testsPassed += 1;
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

function countNamedStatus(text: string, name: string): number {
  const pattern = new RegExp(`${name}=(\\d+)`, 'i');
  const match = pattern.exec(text);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function parseUnittestSummary(text: string): TestCommandCounts | null {
  const matches = [...text.matchAll(/(?:^|\n)\s*Ran\s+(\d+)\s+tests?\s+in\s+[^\n]+/gi)];
  const match = matches.at(-1);
  if (!match) return null;
  const testsRun = Number.parseInt(match[1], 10);
  if (!Number.isFinite(testsRun) || testsRun <= 0) return null;
  const failures = countNamedStatus(text, 'failures');
  const errors = countNamedStatus(text, 'errors');
  const skipped = countNamedStatus(text, 'skipped');
  const testsPassed = Math.max(0, testsRun - failures - errors - skipped);
  return { testsRun, testsPassed };
}

function parseSurefireSummary(text: string): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  const pattern = /Tests run:\s*(\d+),\s*Failures:\s*(\d+),\s*Errors:\s*(\d+),\s*Skipped:\s*(\d+)/gi;
  for (const match of text.matchAll(pattern)) {
    const runCount = Number.parseInt(match[1], 10);
    const failures = Number.parseInt(match[2], 10);
    const errors = Number.parseInt(match[3], 10);
    const skipped = Number.parseInt(match[4], 10);
    if (![runCount, failures, errors, skipped].every(Number.isFinite) || runCount <= 0) continue;
    testsRun += runCount;
    testsPassed += Math.max(0, runCount - failures - errors - skipped);
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

function parseGradleSummary(text: string): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  const pattern = /(\d+)\s+tests?\s+completed\b([^\n]*)/gi;
  for (const match of text.matchAll(pattern)) {
    const completed = Number.parseInt(match[1], 10);
    if (!Number.isFinite(completed) || completed <= 0) continue;
    const counts = countStatusPairs(match[2]);
    const failed = counts.failed ?? 0;
    const skipped = counts.skipped ?? 0;
    testsRun += completed;
    testsPassed += Math.max(0, completed - failed - skipped);
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

function parseTestResultLine(text: string): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  for (const match of text.matchAll(/test result:\s*(?:ok|failed)\.\s*([^\n]+)/gi)) {
    const counts = countsFromStatusSummary(match[1]);
    if (!counts) continue;
    testsRun += counts.testsRun;
    testsPassed += counts.testsPassed;
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

function isTestSummaryLine(line: string): boolean {
  if (!/\b(passed|pass|passing|failed|fail|failing|errors?|skipped|skip|pending|todo|xfailed|xpassed|total)\b/i.test(line)) return false;
  return !/^(?:test\s+files?|files?|suites?|test\s+suites?)\b/i.test(line);
}

function aggregateSummaryLineCounts(lines: readonly string[]): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  for (const line of lines) {
    if (!isTestSummaryLine(line)) continue;
    const counts = countsFromStatusSummary(line);
    if (!counts) continue;
    testsRun += counts.testsRun;
    testsPassed += counts.testsPassed;
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

export function parseTestCommandOutput(stdout: string, stderr: string): TestCommandCounts | null {
  const text = `${stdout}\n${stderr}`;
  const tap = parseTapSummary(text);
  if (tap) return tap;

  const goJson = parseGoTestJsonSummary(text);
  if (goJson) return goJson;

  const cargoLike = parseTestResultLine(text);
  if (cargoLike) return cargoLike;

  const unittest = parseUnittestSummary(text);
  if (unittest) return unittest;

  const surefire = parseSurefireSummary(text);
  if (surefire) return surefire;

  const gradle = parseGradleSummary(text);
  if (gradle) return gradle;

  const summaryLines = text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^=+\s*/, '').replace(/\s*=+$/, ''))
    .filter(Boolean)
    .reverse();

  return aggregateSummaryLineCounts(summaryLines);
}
