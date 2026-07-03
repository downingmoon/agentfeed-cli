import { parseTestCommandOutput } from './test-command-output.js';

export type AgentSessionTestMetricsAccumulator = {
  testsRun: number;
  testsPassed: number;
};

export function recordTestCommandResult(accumulator: AgentSessionTestMetricsAccumulator, output: string, failed: boolean): void {
  const parsedCounts = parseTestCommandOutput(output, '');
  if (parsedCounts) {
    accumulator.testsRun += parsedCounts.testsRun;
    accumulator.testsPassed += parsedCounts.testsPassed;
    return;
  }
  accumulator.testsRun += 1;
  if (!failed) accumulator.testsPassed += 1;
}
