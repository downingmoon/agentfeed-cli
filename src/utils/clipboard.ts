import { spawn } from 'node:child_process';
import { platform, release } from 'node:os';
import { createScrubbedCommandEnv } from './subprocess-env.js';
import { trustedHelperPathEnv, trustedLinuxCommand, trustedMacosCommand, trustedWindowsCommand, trustedWslCommand } from './trusted-command.js';

function clipboardCommands(): Array<{ cmd: string; args: string[] }> {
  const useHarnessPath = Boolean(process.env.AGENTFEED_TEST_CLIPBOARD_LOG);
  if (platform() === 'darwin') return [{ cmd: useHarnessPath ? 'pbcopy' : trustedMacosCommand('pbcopy'), args: [] }];
  if (platform() === 'win32') return [{ cmd: trustedWindowsCommand('clip.exe'), args: [] }];
  if (release().toLowerCase().includes('microsoft')) return [{ cmd: useHarnessPath ? 'clip.exe' : trustedWslCommand('clip.exe'), args: [] }];
  return [
    { cmd: useHarnessPath ? 'xclip' : trustedLinuxCommand('xclip'), args: ['-selection', 'clipboard'] },
    { cmd: useHarnessPath ? 'wl-copy' : trustedLinuxCommand('wl-copy'), args: [] },
    { cmd: useHarnessPath ? 'xsel' : trustedLinuxCommand('xsel'), args: ['--clipboard', '--input'] }
  ];
}

async function tryCopyWithCommand(text: string, cmd: string, args: string[]): Promise<boolean> {
  return await new Promise((resolve) => {
    let settled = false;
    const env = createScrubbedCommandEnv(process.env, { respectAllowlist: false });
    if (!process.env.AGENTFEED_TEST_CLIPBOARD_LOG) env.PATH = trustedHelperPathEnv([cmd], env);
    const child = spawn(cmd, args, { stdio: ['pipe', 'ignore', 'ignore'], env });
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
