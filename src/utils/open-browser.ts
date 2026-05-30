import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';

export async function openBrowser(url: string, options: { timeoutMs?: number } = {}): Promise<boolean> {
  const cmd = platform() === 'darwin' ? 'open' : release().toLowerCase().includes('microsoft') ? 'wslview' : 'xdg-open';
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(opened);
    };
    const timer = setTimeout(() => finish(false), options.timeoutMs ?? 1500);
    const child = spawn(cmd, [url], { stdio: 'ignore' });
    child.unref?.();
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}
