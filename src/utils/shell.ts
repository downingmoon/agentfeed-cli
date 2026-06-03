import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createScrubbedCommandEnv } from './subprocess-env.js';

export { createScrubbedCommandEnv } from './subprocess-env.js';

const execFileAsync = promisify(execFile);

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}
const DEFAULT_COMMAND_TIMEOUT_MS = 120_000;

function timeoutMs(options: RunOptions): number {
  return options.timeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
}

function timedOutMessage(command: string, timeout: number): string {
  return `${command} timed out after ${timeout}ms`;
}

export async function run(command: string, args: string[], cwd: string, options: RunOptions = {}): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  const timeout = timeoutMs(options);
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout, maxBuffer: 1024 * 1024 * 5, env: options.env });
    return { ok: true, stdout: String(stdout), stderr: String(stderr) };
  } catch (error) {
    const err = error as { stdout?: string | Buffer; stderr?: string | Buffer; killed?: boolean; signal?: string | null; code?: string | number };
    const stdout = String(err.stdout ?? '');
    const stderr = String(err.stderr ?? '');
    const timedOut = err.killed === true || err.signal === 'SIGTERM' || err.code === 'ETIMEDOUT';
    return { ok: false, stdout, stderr: stderr || (timedOut ? timedOutMessage(command, timeout) : '') };
  }
}
