import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';
import { createScrubbedCommandEnv } from './subprocess-env.js';
import { trustedHelperPathEnv, trustedLinuxCommand, trustedMacosCommand, trustedWindowsCommand, trustedWslCommand } from './trusted-command.js';

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
  const useHarnessPath = Boolean(process.env.AGENTFEED_TEST_BROWSER_LOG);
  if (currentPlatform === 'darwin') return { cmd: useHarnessPath ? 'open' : trustedMacosCommand('open'), args: [url] };
  if (currentPlatform === 'win32') return { cmd: trustedWindowsCommand('explorer.exe'), args: [url] };
  if (isWsl) return { cmd: useHarnessPath ? 'wslview' : trustedWslCommand('wslview'), args: [url] };
  return { cmd: useHarnessPath ? 'xdg-open' : trustedLinuxCommand('xdg-open'), args: [url] };
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
    const env = createScrubbedCommandEnv(process.env, { respectAllowlist: false });
    if (!process.env.AGENTFEED_TEST_BROWSER_LOG) env.PATH = trustedHelperPathEnv([cmd], env);
    const child = spawn(cmd, args, { stdio: 'ignore', env });
    child.unref?.();
    child.on('error', () => finish(false));
    child.on('close', (code) => finish(code === 0));
  });
}
