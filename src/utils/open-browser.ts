import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';

export async function openBrowser(url: string): Promise<boolean> {
  const cmd = platform() === 'darwin' ? 'open' : release().toLowerCase().includes('microsoft') ? 'wslview' : 'xdg-open';
  return await new Promise((resolve) => {
    const child = spawn(cmd, [url], { stdio: 'ignore', detached: true });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
    child.unref();
  });
}
