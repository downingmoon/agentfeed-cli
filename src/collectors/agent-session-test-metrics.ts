import { parseTestCommandOutput } from './test-command-output.js';

export type AgentSessionTestMetricsAccumulator = {
  testsRun: number;
  testsPassed: number;
};

type RecordTestCommandResultOptions = {
  readonly skipFallback?: boolean;
};

export function recordTestCommandResult(accumulator: AgentSessionTestMetricsAccumulator, output: string, failed: boolean, options: RecordTestCommandResultOptions = {}): boolean {
  const parsedCounts = parseTestCommandOutput(output, '');
  if (parsedCounts) {
    accumulator.testsRun += parsedCounts.testsRun;
    accumulator.testsPassed += parsedCounts.testsPassed;
    return true;
  }
  if (options.skipFallback) return false;
  accumulator.testsRun += 1;
  if (!failed) accumulator.testsPassed += 1;
  return false;
}
