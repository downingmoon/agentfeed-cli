import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';
import { createScrubbedCommandEnv } from './subprocess-env.js';

function clipboardCommands(): Array<{ cmd: string; args: string[] }> {
  if (platform() === 'darwin') return [{ cmd: 'pbcopy', args: [] }];
  if (release().toLowerCase().includes('microsoft')) return [{ cmd: 'clip.exe', args: [] }];
  return [
    { cmd: 'xclip', args: ['-selection', 'clipboard'] },
    { cmd: 'wl-copy', args: [] },
    { cmd: 'xsel', args: ['--clipboard', '--input'] }
  ];
}

async function tryCopyWithCommand(text: string, cmd: string, args: string[]): Promise<boolean> {
  return await new Promise((resolve) => {
    let settled = false;
    const child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'], env: createScrubbedCommandEnv(process.env, { respectAllowlist: false }) });
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
    if (!child.stdin) {
      finish(false);
      return;
    }
    child.stdin.on('error', () => finish(false));
    try {
      child.stdin.end(text);
    } catch {
      finish(false);
    }
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  for (const { cmd, args } of clipboardCommands()) {
    if (await tryCopyWithCommand(text, cmd, args)) return true;
  }
  return false;
}
