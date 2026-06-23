import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, readFile, rm } from 'node:fs/promises';
import { platform } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { writeTextFileAtomic } from '../utils/fs.js';
import { createScrubbedCommandEnv } from '../utils/subprocess-env.js';
import type { SecretStore } from './credentials.js';

const execFileAsync = promisify(execFile);
const KEYCHAIN_SERVICE = 'AgentFeed CLI';
const KEYCHAIN_TIMEOUT_MS = 5_000;

function keychainAccount(agentFeedDir: string): string {
  const digest = createHash('sha256').update(agentFeedDir).digest('hex').slice(0, 24);
  return `agentfeed-${digest}`;
}

function keychainCommandEnv(): NodeJS.ProcessEnv {
  return createScrubbedCommandEnv(process.env, { respectAllowlist: false });
}

async function commandAvailable(command: string, args: string[] = ['--version']): Promise<boolean> {
  return execFileAsync(command, args, { timeout: 2_000, env: keychainCommandEnv() }).then(
    () => true,
    () => false,
  );
}

function spawnWithInput(command: string, args: string[], input: string, timeoutMs = KEYCHAIN_TIMEOUT_MS): Promise<{ readonly stdout: string; readonly stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], env: keychainCommandEnv() });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with ${code ?? 'unknown'}${stderr ? `: ${stderr.trim()}` : ''}`));
    });
    child.stdin.end(input);
  });
}

function trimOneTrailingNewline(value: string): string {
  return value.replace(/\r?\n$/, '');
}

async function windowsPowerShellCommand(): Promise<string | null> {
  for (const command of ['powershell.exe', 'powershell', 'pwsh']) {
    if (await commandAvailable(command, ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'])) return command;
  }
  return null;
}

function windowsDpapiSecretPath(agentFeedDir: string, account: string): string {
  return join(agentFeedDir, `${account}.dpapi`);
}

function macosKeychainStore(service: string, account: string): SecretStore {
  return {
    service,
    account,
    async isAvailable() {
      return commandAvailable('security', ['-h']);
    },
    async read() {
      return execFileAsync('security', ['find-generic-password', '-a', account, '-s', service, '-w'], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }).then(
        ({ stdout }) => trimOneTrailingNewline(stdout),
        () => null,
      );
    },
    async write(secret: string) {
      await spawnWithInput('security', ['add-generic-password', '-a', account, '-s', service, '-U', '-w', secret], '');
    },
    async delete() {
      await execFileAsync('security', ['delete-generic-password', '-a', account, '-s', service], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }).catch(() => undefined);
    },
  };
}

function linuxSecretToolStore(service: string, account: string): SecretStore {
  return {
    service,
    account,
    async isAvailable() {
      return commandAvailable('secret-tool', ['--version']);
    },
    async read() {
      return execFileAsync('secret-tool', ['lookup', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }).then(
        ({ stdout }) => {
          const secret = trimOneTrailingNewline(stdout);
          return secret || null;
        },
        () => null,
      );
    },
    async write(secret: string) {
      await spawnWithInput('secret-tool', ['store', '--label', 'AgentFeed CLI token', 'service', service, 'account', account], secret);
    },
    async delete() {
      await execFileAsync('secret-tool', ['clear', 'service', service, 'account', account], { timeout: KEYCHAIN_TIMEOUT_MS, env: keychainCommandEnv() }).catch(() => undefined);
    },
  };
}

function windowsDpapiStore(agentFeedDir: string, service: string, account: string): SecretStore {
  return {
    service,
    account,
    async isAvailable() {
      return (await windowsPowerShellCommand()) !== null;
    },
    async read() {
      const command = await windowsPowerShellCommand();
      if (!command) return null;
      return readFile(windowsDpapiSecretPath(agentFeedDir, account), 'utf8')
        .then((encryptedSecret) => spawnWithInput(command, [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          [
            "$ErrorActionPreference = 'Stop'",
            'Add-Type -AssemblyName System.Security',
            '$blob = [Console]::In.ReadToEnd().Trim()',
            '$protected = [Convert]::FromBase64String($blob)',
            '$bytes = [System.Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
            '[System.Text.Encoding]::UTF8.GetString($bytes)',
          ].join('; '),
        ], encryptedSecret))
        .then(({ stdout }) => {
          const secret = trimOneTrailingNewline(stdout);
          return secret || null;
        }, () => null);
    },
    async write(secret: string) {
      const command = await windowsPowerShellCommand();
      if (!command) throw new Error('Windows PowerShell is not available for DPAPI credential storage.');
      const { stdout } = await spawnWithInput(command, [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        [
          "$ErrorActionPreference = 'Stop'",
          'Add-Type -AssemblyName System.Security',
          '$secret = [Console]::In.ReadToEnd()',
          '$bytes = [System.Text.Encoding]::UTF8.GetBytes($secret)',
          '$protected = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)',
          '[Convert]::ToBase64String($protected)',
        ].join('; '),
      ], secret);
      const encryptedSecret = trimOneTrailingNewline(stdout);
      if (!encryptedSecret) throw new Error('Windows DPAPI did not return an encrypted credential payload.');
      await writeTextFileAtomic(windowsDpapiSecretPath(agentFeedDir, account), `${encryptedSecret}\n`, { mode: 0o600 });
      await chmod(windowsDpapiSecretPath(agentFeedDir, account), 0o600).catch(() => undefined);
    },
    async delete() {
      await rm(windowsDpapiSecretPath(agentFeedDir, account), { force: true });
    },
  };
}

export function createNativeKeychainStore(agentFeedDir: string, metadata: { readonly keychain_service?: string; readonly keychain_account?: string } = {}): SecretStore {
  const service = metadata.keychain_service || KEYCHAIN_SERVICE;
  const account = metadata.keychain_account || keychainAccount(agentFeedDir);
  const currentPlatform = platform();

  if (currentPlatform === 'darwin') return macosKeychainStore(service, account);
  if (currentPlatform === 'linux') return linuxSecretToolStore(service, account);
  if (currentPlatform === 'win32') return windowsDpapiStore(agentFeedDir, service, account);

  return {
    service,
    account,
    async isAvailable() { return false; },
    async read() { return null; },
    async write() { throw new Error(`OS keychain credential storage is not available on ${currentPlatform}.`); },
  };
}
