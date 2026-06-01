import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';

export async function openBrowser(url: string, options: { timeoutMs?: number } = {}): Promise<boolean> {
  const currentPlatform = platform();
  const isWsl = currentPlatform === 'linux' && release().toLowerCase().includes('microsoft');
  const cmd = currentPlatform === 'darwin' ? 'open' : currentPlatform === 'win32' ? 'cmd' : isWsl ? 'wslview' : 'xdg-open';
  const args = currentPlatform === 'win32' ? ['/c', 'start', '', url] : [url];
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(opened);
    };
    const timer = setTimeout(() => finish(false), options.timeoutMs ?? 5000);
    const child = spawn(cmd, args, { stdio: 'ignore' });
    child.unref?.();
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}
