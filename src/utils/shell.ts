import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { createScrubbedCommandEnv } from './subprocess-env.js';

export { createScrubbedCommandEnv } from './subprocess-env.js';

const execFileAsync = promisify(execFile);

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}
export async function run(command: string, args: string[], cwd: string, options: RunOptions = {}): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout: options.timeoutMs ?? 120_000, maxBuffer: 1024 * 1024 * 5, env: options.env });
    return { ok: true, stdout: String(stdout), stderr: String(stderr) };
  } catch (error) {
    const err = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return { ok: false, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}
