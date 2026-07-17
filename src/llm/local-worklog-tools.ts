import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
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

type SpawnCommand = (input: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly stdin: string;
  readonly timeoutMs: number;
  readonly env: NodeJS.ProcessEnv;
}) => Promise<{ readonly stdout: string; readonly stderr: string }>;

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
    case 'codex': return ['exec', '--sandbox', 'read-only', '--ephemeral', '-'];
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

export async function spawnCommand(input: {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly stdin: string;
  readonly timeoutMs: number;
  readonly env: NodeJS.ProcessEnv;
}): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return await new Promise((resolve, reject) => {
    const child = spawn(input.command, [...input.args], {
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
