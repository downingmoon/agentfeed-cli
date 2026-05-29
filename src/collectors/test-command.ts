import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentFeedProjectConfig, WorklogMetrics } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { run } from '../utils/shell.js';

interface ResolvedCommand {
  command: string;
  args: string[];
}

function splitCommandLine(commandLine: string): string[] {
  const parts = commandLine.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return parts.map((part) => part.replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean);
}

async function inferTestCommand(cwd: string): Promise<ResolvedCommand | null> {
  const packageJsonPath = join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    const pkg = await readJson<{ scripts?: Record<string, string> }>(packageJsonPath).catch(() => null);
    if (pkg?.scripts?.test) return { command: 'npm', args: ['test'] };
  }
  if (await pathExists(join(cwd, 'pyproject.toml')) || await pathExists(join(cwd, 'pytest.ini'))) return { command: 'pytest', args: [] };
  if (await pathExists(join(cwd, 'go.mod'))) return { command: 'go', args: ['test', './...'] };
  if (await pathExists(join(cwd, 'Cargo.toml'))) return { command: 'cargo', args: ['test'] };
  const makefilePath = join(cwd, 'Makefile');
  if (await pathExists(makefilePath)) {
    const makefile = await readFile(makefilePath, 'utf8').catch(() => '');
    if (/^test:/m.test(makefile)) return { command: 'make', args: ['test'] };
  }
  return null;
}

async function resolveTestCommand(cwd: string, config: AgentFeedProjectConfig): Promise<ResolvedCommand | null> {
  if (!config.collection.run_tests_on_collect || !config.collection.include_test_results) return null;
  const configured = config.commands.test;
  if (!configured) return null;
  if (configured === 'auto') return inferTestCommand(cwd);
  const [command, ...args] = splitCommandLine(configured);
  return command ? { command, args } : null;
}

export async function collectConfiguredTestMetrics(cwd: string, config: AgentFeedProjectConfig): Promise<Pick<WorklogMetrics, 'tests_run' | 'tests_passed' | 'failed_commands' | 'commands_run'> | null> {
  const testCommand = await resolveTestCommand(cwd, config);
  if (!testCommand) return null;
  const result = await run(testCommand.command, testCommand.args, cwd);
  return {
    tests_run: 1,
    tests_passed: result.ok ? 1 : 0,
    failed_commands: result.ok ? null : 1,
    commands_run: 1
  };
}
