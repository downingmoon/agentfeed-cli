import type { AgentFeedProjectConfig, WorklogMetrics } from '../types.js';
import { createScrubbedCommandEnv, run } from '../utils/shell.js';
import { parseTestCommandOutput } from './test-command-output.js';
import { resolveConfiguredCommands } from './test-command-resolution.js';

export { parseTestCommandOutput } from './test-command-output.js';

const DEFAULT_CONFIGURED_COMMAND_TIMEOUT_MS = 120_000;

function configuredCommandTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_COMMAND_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONFIGURED_COMMAND_TIMEOUT_MS;
}

interface ConfiguredCommandMetricStatus {
  metrics: Pick<WorklogMetrics, 'tests_run' | 'tests_passed' | 'failed_commands' | 'commands_run'> | null;
  warnings: string[];
}

export async function collectConfiguredCommandMetricsWithStatus(cwd: string, config: AgentFeedProjectConfig): Promise<ConfiguredCommandMetricStatus> {
  const resolved = await resolveConfiguredCommands(cwd, config);
  const commands = resolved.commands;
  if (!commands) return { metrics: null, warnings: resolved.warnings };
  const commandEnv = createScrubbedCommandEnv();
  const timeoutMs = configuredCommandTimeoutMs();
  let testsRun: number | null = null;
  let testsPassed: number | null = null;
  let failedCommands = 0;
  let commandsRun = 0;
  if (commands.test) {
    const result = await run(commands.test.command, commands.test.args, cwd, { env: commandEnv, timeoutMs });
    commandsRun += 1;
    const parsedCounts = parseTestCommandOutput(result.stdout, result.stderr);
    testsRun = parsedCounts?.testsRun ?? null;
    testsPassed = parsedCounts?.testsPassed ?? null;
    if (!result.ok) failedCommands += 1;
  }
  if (commands.build) {
    const result = await run(commands.build.command, commands.build.args, cwd, { env: commandEnv, timeoutMs });
    commandsRun += 1;
    if (!result.ok) failedCommands += 1;
  }
  if (!commandsRun) return { metrics: null, warnings: resolved.warnings };
  return {
    metrics: {
      tests_run: testsRun,
      tests_passed: testsPassed,
      failed_commands: failedCommands || null,
      commands_run: commandsRun
    },
    warnings: resolved.warnings
  };
}

export async function collectConfiguredCommandMetrics(cwd: string, config: AgentFeedProjectConfig): Promise<Pick<WorklogMetrics, 'tests_run' | 'tests_passed' | 'failed_commands' | 'commands_run'> | null> {
  return (await collectConfiguredCommandMetricsWithStatus(cwd, config)).metrics;
}
