import { existsSync } from 'node:fs';
import { delimiter, dirname } from 'node:path';

const TRUSTED_UNIX_DIRS = ['/usr/bin', '/bin', '/usr/local/bin'] as const;
const TRUSTED_WINDOWS_DIRS = [
  'C:\\Windows\\System32',
  'C:\\Windows',
  'C:\\Windows\\System32\\WindowsPowerShell\\v1.0',
  'C:\\Program Files\\PowerShell\\7',
] as const;

function firstExistingPath(candidates: readonly string[]): string {
  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0] ?? '';
}

function trustedWindowsPath(env: NodeJS.ProcessEnv): string {
  const systemRoot = env.SystemRoot || env.WINDIR || 'C:\\Windows';
  return [
    `${systemRoot}\\System32`,
    systemRoot,
    `${systemRoot}\\System32\\WindowsPowerShell\\v1.0`,
    'C:\\Program Files\\PowerShell\\7',
  ].join(delimiter);
}

export function trustedMacosCommand(command: 'security' | 'open' | 'pbcopy'): string {
  return `/usr/bin/${command}`;
}

export function trustedLinuxCommand(command: 'secret-tool' | 'xdg-open' | 'xclip' | 'wl-copy' | 'xsel'): string {
  return firstExistingPath(TRUSTED_UNIX_DIRS.map((dir) => `${dir}/${command}`));
}

export function trustedWslCommand(command: 'wslview' | 'clip.exe'): string {
  return firstExistingPath(TRUSTED_UNIX_DIRS.map((dir) => `${dir}/${command}`));
}

export function trustedWindowsCommand(command: 'explorer.exe' | 'powershell.exe' | 'powershell' | 'pwsh' | 'clip.exe'): string {
  if (command === 'explorer.exe') return 'C:\\Windows\\explorer.exe';
  if (command === 'clip.exe') return 'C:\\Windows\\System32\\clip.exe';
  if (command === 'powershell.exe' || command === 'powershell') return 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
  return 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
}

export function trustedHelperPathEnv(commandPaths: readonly string[], baseEnv: NodeJS.ProcessEnv = process.env): string {
  const dirs = commandPaths.map((commandPath) => dirname(commandPath));
  const defaultDirs = process.platform === 'win32' ? TRUSTED_WINDOWS_DIRS : TRUSTED_UNIX_DIRS;
  return [...new Set([...dirs, ...defaultDirs])].join(delimiter) || trustedWindowsPath(baseEnv);
}
