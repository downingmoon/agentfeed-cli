import { countStatusPairs, type TestCommandCounts } from './test-command-counts.js';

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

function parseDotnetSummary(text: string): TestCommandCounts | null {
  let testsRun = 0;
  let testsPassed = 0;
  const pattern = /\bFailed:\s*(\d+),\s*Passed:\s*(\d+),\s*Skipped:\s*(\d+),\s*Total:\s*(\d+)/gi;
  for (const match of text.matchAll(pattern)) {
    const failed = Number.parseInt(match[1], 10);
    const passed = Number.parseInt(match[2], 10);
    const skipped = Number.parseInt(match[3], 10);
    const total = Number.parseInt(match[4], 10);
    if (![failed, passed, skipped, total].every(Number.isFinite) || total <= 0) continue;
    testsRun += total;
    testsPassed += Math.min(passed, Math.max(0, total - failed - skipped));
  }
  return testsRun > 0 ? { testsRun, testsPassed } : null;
}

export function parseKnownFrameworkSummary(text: string): TestCommandCounts | null {
  return parseUnittestSummary(text)
    ?? parseSurefireSummary(text)
    ?? parseGradleSummary(text)
    ?? parseDotnetSummary(text);
}
