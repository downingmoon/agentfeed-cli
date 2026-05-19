import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function run(command: string, args: string[], cwd: string): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout: 120_000, maxBuffer: 1024 * 1024 * 5 });
    return { ok: true, stdout: String(stdout), stderr: String(stderr) };
  } catch (error) {
    const err = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return { ok: false, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}
