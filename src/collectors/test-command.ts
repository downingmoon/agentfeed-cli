import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { AgentFeedProjectConfig, WorklogMetrics } from '../types.js';
import { pathExists, readJson } from '../utils/fs.js';
import { createScrubbedCommandEnv, run } from '../utils/shell.js';

interface ResolvedCommand {
  command: string;
  args: string[];
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

async function inferBuildCommand(cwd: string): Promise<ResolvedCommand | null> {
  const packageJsonPath = join(cwd, 'package.json');
  if (await pathExists(packageJsonPath)) {
    const pkg = await readJson<{ scripts?: Record<string, string> }>(packageJsonPath).catch(() => null);
    if (pkg?.scripts?.build) return { command: 'npm', args: ['run', 'build'] };
  }
  if (await pathExists(join(cwd, 'go.mod'))) return { command: 'go', args: ['build', './...'] };
  if (await pathExists(join(cwd, 'Cargo.toml'))) return { command: 'cargo', args: ['build'] };
  const makefilePath = join(cwd, 'Makefile');
  if (await pathExists(makefilePath)) {
    const makefile = await readFile(makefilePath, 'utf8').catch(() => '');
    if (/^build:/m.test(makefile)) return { command: 'make', args: ['build'] };
  }
  return null;
}

async function resolveConfiguredCommand(cwd: string, configured: 'auto' | string | null, infer: (cwd: string) => Promise<ResolvedCommand | null>): Promise<ResolvedCommand | null> {
  if (!configured) return null;
  if (configured === 'auto') return infer(cwd);
  const [command, ...args] = splitCommandLine(configured);
  if (!command) return null;
  assertSafeConfiguredCommand(command, args);
  return { command, args };
}

async function resolveConfiguredCommands(cwd: string, config: AgentFeedProjectConfig): Promise<{ test: ResolvedCommand | null; build: ResolvedCommand | null } | null> {
  if (!config.collection.run_tests_on_collect || !config.collection.include_test_results) return null;
  return {
    test: await resolveConfiguredCommand(cwd, config.commands.test, inferTestCommand),
    build: await resolveConfiguredCommand(cwd, config.commands.build, inferBuildCommand)
  };
}

export async function collectConfiguredCommandMetrics(cwd: string, config: AgentFeedProjectConfig): Promise<Pick<WorklogMetrics, 'tests_run' | 'tests_passed' | 'failed_commands' | 'commands_run'> | null> {
  const commands = await resolveConfiguredCommands(cwd, config);
  if (!commands) return null;
  const commandEnv = createScrubbedCommandEnv();
  let testsRun: number | null = null;
  let testsPassed: number | null = null;
  let failedCommands = 0;
  let commandsRun = 0;
  if (commands.test) {
    const result = await run(commands.test.command, commands.test.args, cwd, { env: commandEnv });
    commandsRun += 1;
    testsRun = 1;
    testsPassed = result.ok ? 1 : 0;
    if (!result.ok) failedCommands += 1;
  }
  if (commands.build) {
    const result = await run(commands.build.command, commands.build.args, cwd, { env: commandEnv });
    commandsRun += 1;
    if (!result.ok) failedCommands += 1;
  }
  if (!commandsRun) return null;
  return {
    tests_run: testsRun,
    tests_passed: testsPassed,
    failed_commands: failedCommands || null,
    commands_run: commandsRun
  };
}
