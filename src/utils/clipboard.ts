import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';

function clipboardCommand(): { cmd: string; args: string[] } {
  if (platform() === 'darwin') return { cmd: 'pbcopy', args: [] };
  if (release().toLowerCase().includes('microsoft')) return { cmd: 'clip.exe', args: [] };
  return { cmd: 'xclip', args: ['-selection', 'clipboard'] };
}

export async function copyToClipboard(text: string): Promise<boolean> {
  const { cmd, args } = clipboardCommand();
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
