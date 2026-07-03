export type TestCommandCounts = {
  readonly testsRun: number;
  readonly testsPassed: number;
};

export type TestStatusCounts = Readonly<Record<string, number>>;

export function countStatusPairs(text: string): TestStatusCounts {
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
