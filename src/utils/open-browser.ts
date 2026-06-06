import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';
import { createScrubbedCommandEnv } from './subprocess-env.js';

function realBrowserOpenDisabledForTests(): boolean {
  const testHarnessRequestedNoBrowser = process.env.AGENTFEED_TEST_DISABLE_REAL_BROWSER === '1'
    || process.env.NODE_ENV === 'test'
    || process.env.VITEST === 'true'
    || process.env.VITEST_WORKER_ID !== undefined;
  return testHarnessRequestedNoBrowser && !process.env.AGENTFEED_TEST_BROWSER_LOG;
}

function containsBrowserUnsafeControl(url: string): boolean {
  return /[\x00-\x1f\x7f]/.test(url);
}

function browserOpenCommand(currentPlatform: NodeJS.Platform, isWsl: boolean, url: string): { cmd: string; args: string[] } {
  if (currentPlatform === 'darwin') return { cmd: 'open', args: [url] };
  if (currentPlatform === 'win32') return { cmd: 'explorer.exe', args: [url] };
  if (isWsl) return { cmd: 'wslview', args: [url] };
  return { cmd: 'xdg-open', args: [url] };
}

export async function openBrowser(url: string, options: { timeoutMs?: number } = {}): Promise<boolean> {
  if (realBrowserOpenDisabledForTests()) return false;
  if (containsBrowserUnsafeControl(url)) return false;
  const currentPlatform = platform();
  const isWsl = currentPlatform === 'linux' && release().toLowerCase().includes('microsoft');
  const { cmd, args } = browserOpenCommand(currentPlatform, isWsl, url);
  return await new Promise((resolve) => {
    let settled = false;
    const finish = (opened: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(opened);
    };
    const timer = setTimeout(() => finish(false), options.timeoutMs ?? 5000);
    const child = spawn(cmd, args, { stdio: 'ignore', env: createScrubbedCommandEnv(process.env, { respectAllowlist: false }) });
    child.unref?.();
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}
