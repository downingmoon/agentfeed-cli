import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { AgentFeedProjectConfig, WorklogMetrics } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { createScrubbedCommandEnv, run } from '../utils/shell.js';
import { parseTestCommandOutput } from './test-command-output.js';

export { parseTestCommandOutput } from './test-command-output.js';

const DEFAULT_CONFIGURED_COMMAND_TIMEOUT_MS = 120_000;

function configuredCommandTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_COMMAND_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CONFIGURED_COMMAND_TIMEOUT_MS;
}

interface ResolvedCommand {
  command: string;
  args: string[];
}

interface ResolvedCommandSet {
  commands: { test: ResolvedCommand | null; build: ResolvedCommand | null } | null;
  warnings: string[];
}

interface ConfiguredCommandMetricStatus {
  metrics: Pick<WorklogMetrics, 'tests_run' | 'tests_passed' | 'failed_commands' | 'commands_run'> | null;
  warnings: string[];
}

const SHELL_INTERPRETER_COMMANDS = new Set([
  'bash',
  'cmd',
  'cmd.exe',
  'csh',
  'dash',
  'fish',
  'ksh',
  'powershell',
  'powershell.exe',
  'pwsh',
  'pwsh.exe',
  'sh',
  'tcsh',
  'zsh'
]);

const COMMAND_WRAPPER_COMMANDS = new Set([
  'command',
  'command.exe',
  'env',
  'env.exe'
]);

const ENV_OPTIONS_WITH_VALUE = new Set([
  '-u',
  '--unset',
  '-C',
  '--chdir'
]);

function commandName(command: string): string {
  return basename(command).toLowerCase();
}

function assertSafeConfiguredCommand(command: string, args: string[] = []): void {
  const tokens = [command, ...args];
  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    const name = commandName(token);
    if (SHELL_INTERPRETER_COMMANDS.has(name)) {
      throw new Error(`Refusing to run configured command through a shell interpreter (${token}). Configure a direct test/build command instead.`);
    }
    if (!COMMAND_WRAPPER_COMMANDS.has(name)) return;
    if (name === 'env' || name === 'env.exe') {
      index += 1;
      while (index < tokens.length) {
        const envToken = tokens[index];
        if (envToken === '--') {
          index += 1;
          break;
        }
        if (envToken === '-S' || envToken.startsWith('-S=')) {
          throw new Error('Refusing to run configured command through a shell interpreter (env -S). Configure a direct test/build command instead.');
        }
        if (ENV_OPTIONS_WITH_VALUE.has(envToken)) {
          index += 2;
          continue;
        }
        if (envToken.startsWith('--unset=') || envToken.startsWith('--chdir=')) {
          index += 1;
          continue;
        }
        if (envToken.startsWith('-')) {
          index += 1;
          continue;
        }
        if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(envToken)) {
          index += 1;
          continue;
        }
        break;
      }
      if (index >= tokens.length) {
        throw new Error(`Configured command wrapper (${token}) did not include a direct command to run.`);
      }
      continue;
    }
    if (name === 'command' || name === 'command.exe') {
      index += 1;
      while (index < tokens.length && tokens[index].startsWith('-')) index += 1;
      if (index >= tokens.length) {
        throw new Error(`Configured command wrapper (${token}) did not include a direct command to run.`);
      }
      continue;
    }
    return;
  }
}

function splitCommandLine(commandLine: string): string[] {
  const parts = commandLine.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) ?? [];
  return parts.map((part) => part.replace(/^(['"])(.*)\1$/, '$2')).filter(Boolean);
}

function compactCommandInferenceFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 240);
}

async function readPackageScriptsForInference(cwd: string, purpose: 'test' | 'build', warnings: string[]): Promise<Record<string, string> | null> {
  const packageJsonPath = join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    try {
      const pkg = await readJson<{ scripts?: Record<string, string> }>(packageJsonPath);
      return pkg && typeof pkg === 'object' && pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : null;
    } catch (error) {
      warnings.push([
        `Could not read package.json while inferring the ${purpose} command; automatic command collection skipped npm ${purpose}.`,
        compactCommandInferenceFailure(error),
        'Fix package.json or configure .agentfeed/config.json commands explicitly.'
      ].filter(Boolean).join(' '));
    }
  }
  return null;
}

async function readMakefileForInference(cwd: string, purpose: 'test' | 'build', warnings: string[]): Promise<string | null> {
  const makefilePath = join(cwd, 'Makefile');
  if (!(await pathExists(makefilePath))) return null;
  try {
    return await readFile(makefilePath, 'utf8');
  } catch (error) {
    warnings.push([
      `Could not read Makefile while inferring the ${purpose} command; automatic command collection skipped make ${purpose}.`,
      compactCommandInferenceFailure(error),
      'Fix Makefile permissions or configure .agentfeed/config.json commands explicitly.'
    ].filter(Boolean).join(' '));
  }
  return null;
}

async function inferTestCommand(cwd: string, warnings: string[]): Promise<ResolvedCommand | null> {
  const scripts = await readPackageScriptsForInference(cwd, 'test', warnings);
  if (scripts?.test) return { command: 'npm', args: ['test'] };
  if (await pathExists(join(cwd, 'pyproject.toml')) || await pathExists(join(cwd, 'pytest.ini'))) return { command: 'pytest', args: [] };
  if (await pathExists(join(cwd, 'go.mod'))) return { command: 'go', args: ['test', './...'] };
  if (await pathExists(join(cwd, 'Cargo.toml'))) return { command: 'cargo', args: ['test'] };
  const makefile = await readMakefileForInference(cwd, 'test', warnings);
  if (makefile && /^test:/m.test(makefile)) return { command: 'make', args: ['test'] };
  return null;
}

async function inferBuildCommand(cwd: string, warnings: string[]): Promise<ResolvedCommand | null> {
  const scripts = await readPackageScriptsForInference(cwd, 'build', warnings);
  if (scripts?.build) return { command: 'npm', args: ['run', 'build'] };
  if (await pathExists(join(cwd, 'go.mod'))) return { command: 'go', args: ['build', './...'] };
  if (await pathExists(join(cwd, 'Cargo.toml'))) return { command: 'cargo', args: ['build'] };
  const makefile = await readMakefileForInference(cwd, 'build', warnings);
  if (makefile && /^build:/m.test(makefile)) return { command: 'make', args: ['build'] };
  return null;
}

async function resolveConfiguredCommand(cwd: string, configured: 'auto' | string | null, infer: (cwd: string, warnings: string[]) => Promise<ResolvedCommand | null>, warnings: string[]): Promise<ResolvedCommand | null> {
  if (!configured) return null;
  if (configured === 'auto') return infer(cwd, warnings);
  const [command, ...args] = splitCommandLine(configured);
  if (!command) return null;
  assertSafeConfiguredCommand(command, args);
  return { command, args };
}

async function resolveConfiguredCommands(cwd: string, config: AgentFeedProjectConfig): Promise<ResolvedCommandSet> {
  if (!config.collection.run_tests_on_collect || !config.collection.include_test_results) return { commands: null, warnings: [] };
  const warnings: string[] = [];
  return {
    commands: {
      test: await resolveConfiguredCommand(cwd, config.commands.test, inferTestCommand, warnings),
      build: await resolveConfiguredCommand(cwd, config.commands.build, inferBuildCommand, warnings)
    },
    warnings
  };
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
