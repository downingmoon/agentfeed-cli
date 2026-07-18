import { spawn, type ChildProcessWithoutNullStreams, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { access, open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { createScrubbedCommandEnv } from '../utils/subprocess-env.js';

export type LocalAiWorklogToolId = 'claude' | 'codex' | 'gemini' | 'antigravity';

export type LocalAiWorklogTool = {
  readonly id: LocalAiWorklogToolId;
  readonly label: string;
  readonly command: string;
};

type ResolveCommand = (command: string, env?: NodeJS.ProcessEnv) => Promise<string | null>;

type SpawnProcess = (command: string, args: readonly string[], options: SpawnOptionsWithoutStdio) => ChildProcessWithoutNullStreams;

type SpawnCommandInput = {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly stdin: string;
  readonly timeoutMs: number;
  readonly env: NodeJS.ProcessEnv;
  readonly spawnProcess?: SpawnProcess;
  readonly platform?: NodeJS.Platform;
};

type SpawnCommand = (input: SpawnCommandInput) => Promise<{ readonly stdout: string; readonly stderr: string }>;

type SpawnFailure = Error & { readonly code?: string };

type SpawnFallback = {
  readonly command: string;
  readonly argsPrefix: readonly string[];
};

export type LocalAiWorklogToolDependencies = {
  readonly resolveCommand?: ResolveCommand;
  readonly spawnCommand?: SpawnCommand;
  readonly env?: NodeJS.ProcessEnv;
};

const TOOL_LABELS: Readonly<Record<LocalAiWorklogToolId, string>> = {
  claude: 'Claude Code',
  codex: 'Codex CLI',
  gemini: 'Gemini CLI (legacy)',
  antigravity: 'Antigravity CLI'
};

const TOOL_COMMANDS: Readonly<Record<LocalAiWorklogToolId, readonly string[]>> = {
  claude: ['claude'],
  codex: ['codex'],
  gemini: ['gemini'],
  antigravity: ['agy', 'antigravity']
};
const TOOL_IDS: readonly LocalAiWorklogToolId[] = ['claude', 'codex', 'gemini', 'antigravity'] as const;
const EXEC_TIMEOUT_MS = 120_000;
const OUTPUT_MAX_BYTES = 256 * 1024;

async function canExecute(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function executableNames(command: string, env: NodeJS.ProcessEnv): readonly string[] {
  if (process.platform !== 'win32') return [command];
  const extensions = (env.PATHEXT ?? '.EXE;.CMD;.BAT')
    .split(';')
    .map((extension) => extension.trim().toLowerCase())
    .filter(Boolean);
  if (extensions.some((extension) => command.toLowerCase().endsWith(extension))) return [command];
  return extensions.map((extension) => `${command}${extension}`);
}

export async function resolvePathCommand(command: string, env: NodeJS.ProcessEnv = process.env): Promise<string | null> {
  const pathValue = env.PATH ?? '';
  for (const dir of pathValue.split(delimiter).filter(Boolean)) {
    for (const name of executableNames(command, env)) {
      const candidate = join(dir, name);
      if (await canExecute(candidate)) return candidate;
    }
  }
  return null;
}

export async function detectLocalAiWorklogTools(dependencies: LocalAiWorklogToolDependencies = {}): Promise<readonly LocalAiWorklogTool[]> {
  const resolveCommand = dependencies.resolveCommand ?? resolvePathCommand;
  const env = dependencies.env ?? process.env;
  const tools: LocalAiWorklogTool[] = [];
  for (const id of TOOL_IDS) {
    for (const commandName of TOOL_COMMANDS[id]) {
      const command = await resolveCommand(commandName, env);
      if (!command) continue;
      tools.push({ id, label: TOOL_LABELS[id], command });
      break;
    }
  }
  return tools;
}

function finalArgsForTool(tool: LocalAiWorklogToolId, prompt: string): readonly string[] {
  switch (tool) {
    case 'claude': return ['--print', prompt];
    case 'codex': return ['exec', '--sandbox', 'read-only', '--ephemeral', '--ignore-rules', '--skip-git-repo-check', '--color', 'never', '-'];
    case 'gemini': return ['-p', prompt];
    case 'antigravity': return ['-p', prompt];
  }
}

function stdinForTool(tool: LocalAiWorklogToolId, prompt: string): string {
  switch (tool) {
    case 'claude':
      return '';
    case 'codex':
      return prompt;
    case 'gemini':
    case 'antigravity':
      return '';
  }
}

function isSpawnFailure(error: unknown): error is SpawnFailure {
  return error instanceof Error && 'code' in error && typeof error.code === 'string';
}

async function nodeShebangCommand(command: string, platform: NodeJS.Platform = process.platform): Promise<SpawnFallback | null> {
  if (platform === 'win32') return null;
  try {
    const file = await open(command, 'r');
    try {
      const buffer = Buffer.alloc(256);
      const result = await file.read(buffer, 0, buffer.length, 0);
      const header = buffer.subarray(0, result.bytesRead).toString('utf8');
      const firstLine = header.split('\n', 1)[0] ?? '';
      if (!firstLine.startsWith('#!') || !/\bnode(?:\s|$)/.test(firstLine)) return null;
      return { command: process.execPath, argsPrefix: [command] };
    } finally {
      await file.close();
    }
  } catch {
    return null;
  }
}

function defaultSpawnProcess(command: string, args: readonly string[], options: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
  return spawn(command, [...args], options);
}

function windowsCmdCommand(command: string, env: NodeJS.ProcessEnv): SpawnFallback {
  return {
    command: env.ComSpec ?? env.COMSPEC ?? 'cmd.exe',
    argsPrefix: ['/d', '/s', '/c', 'call', command]
  };
}

async function spawnFallbackCommand(input: SpawnCommandInput): Promise<SpawnFallback | null> {
  const platform = input.platform ?? process.platform;
  if (platform === 'win32') return windowsCmdCommand(input.command, input.env);
  return await nodeShebangCommand(input.command, platform);
}

async function spawnCommandOnce(input: SpawnCommandInput): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return await new Promise((resolve, reject) => {
    const spawnProcess = input.spawnProcess ?? defaultSpawnProcess;
    const child = spawnProcess(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Local AI worklog command timed out after ${input.timeoutMs}ms.`));
    }, input.timeoutMs);
    child.stdout.on('data', (chunk: Buffer) => { stdout = `${stdout}${chunk.toString('utf8')}`.slice(0, OUTPUT_MAX_BYTES); });
    child.stderr.on('data', (chunk: Buffer) => { stderr = `${stderr}${chunk.toString('utf8')}`.slice(0, OUTPUT_MAX_BYTES); });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(`Local AI worklog command exited with code ${code ?? 'unknown'}: ${stderr.trim() || stdout.trim()}`));
    });
    child.stdin.end(input.stdin);
  });
}

export async function spawnCommand(input: SpawnCommandInput): Promise<{ readonly stdout: string; readonly stderr: string }> {
  try {
    return await spawnCommandOnce(input);
  } catch (error) {
    if (!isSpawnFailure(error) || error.code !== 'EINVAL') throw error;
    const fallback = await spawnFallbackCommand(input);
    if (!fallback) throw error;
    return await spawnCommandOnce({
      ...input,
      command: fallback.command,
      args: [...fallback.argsPrefix, ...input.args]
    });
  }
}

export async function runLocalAiWorklogTool(input: {
  readonly tool: LocalAiWorklogTool;
  readonly cwd: string;
  readonly prompt: string;
  readonly dependencies?: LocalAiWorklogToolDependencies;
}): Promise<string> {
  const commandRunner = input.dependencies?.spawnCommand ?? spawnCommand;
  const env = createScrubbedCommandEnv(input.dependencies?.env ?? process.env, { respectAllowlist: false });
  const result = await commandRunner({
    command: input.tool.command,
    args: finalArgsForTool(input.tool.id, input.prompt),
    cwd: input.cwd,
    stdin: stdinForTool(input.tool.id, input.prompt),
    timeoutMs: EXEC_TIMEOUT_MS,
    env
  });
  return result.stdout.trim();
}
