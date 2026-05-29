import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';

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
    const child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'] });
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
    child.stdin.end(text);
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  for (const { cmd, args } of clipboardCommands()) {
    if (await tryCopyWithCommand(text, cmd, args)) return true;
  }
  return false;
}
