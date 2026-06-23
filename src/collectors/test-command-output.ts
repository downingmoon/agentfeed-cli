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
  const testsMatch = /(?:^|\n)\s*#?\s*tests\s+(\d+)\b/i.exec(text);
  const passMatch = /(?:^|\n)\s*#?\s*pass(?:ed)?\s+(\d+)\b/i.exec(text);
  const failMatch = /(?:^|\n)\s*#?\s*fail(?:ed)?\s+(\d+)\b/i.exec(text);
  if (!testsMatch || !passMatch) return null;
  const testsRun = Number.parseInt(testsMatch[1], 10);
  const passed = Number.parseInt(passMatch[1], 10);
  const failed = failMatch ? Number.parseInt(failMatch[1], 10) : 0;
  if (!Number.isFinite(testsRun) || !Number.isFinite(passed) || !Number.isFinite(failed) || testsRun <= 0) return null;
  return {
    testsRun,
    testsPassed: Math.min(passed, testsRun)
  };
}

function parseTestResultLine(text: string): TestCommandCounts | null {
  const matches = [...text.matchAll(/test result:\s*(?:ok|failed)\.\s*([^\n]+)/gi)];
  const match = matches.at(-1);
  if (!match) return null;
  return countsFromStatusSummary(match[1]);
}

export function parseTestCommandOutput(stdout: string, stderr: string): TestCommandCounts | null {
  const text = `${stdout}\n${stderr}`;
  const tap = parseTapSummary(text);
  if (tap) return tap;

  const cargoLike = parseTestResultLine(text);
  if (cargoLike) return cargoLike;

  const summaryLines = text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^=+\s*/, '').replace(/\s*=+$/, ''))
    .filter(Boolean)
    .reverse();

  for (const line of summaryLines) {
    if (!/\b(passed|pass|passing|failed|fail|failing|errors?|skipped|skip|pending|todo|xfailed|xpassed|total)\b/i.test(line)) continue;
    const counts = countsFromStatusSummary(line);
    if (counts) return counts;
  }

  return null;
}
