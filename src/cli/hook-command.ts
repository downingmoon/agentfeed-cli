import { resolveProjectRoot } from '../config/project-config.js';
import { uninstallClaudeCodeHook } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { hookInstallDeprecatedMessage, hookUsageMessage, unsupportedHookTargetMessage } from './command-recovery.js';
import { hookJsonPayload, renderHookHumanLines, type HookUninstallOutputInput } from './hook-output.js';

interface HookCommandIo {
  readonly cwd: string;
  readonly print: (text?: string) => void;
  readonly printLines: (lines: readonly string[]) => void;
}

export async function runHookCommand(args: string[], io: HookCommandIo): Promise<void> {
  const action = args[0];
  const target = args[1];
  if (target !== 'claude-code') throw new Error(unsupportedHookTargetMessage());
  const root = await resolveProjectRoot(io.cwd);
  const scope = flag(args, '--global') ? 'global' : 'project';
  const settingsPath = option(args, '--settings-path');
  if (action === 'install') {
    throw new Error(hookInstallDeprecatedMessage());
  }
  if (action === 'uninstall') {
    const result = await uninstallClaudeCodeHook({ projectRoot: root, scope, settingsPath });
    const hookOutput = {
      action: 'uninstall',
      scope,
      settingsPath: result.path,
      backupPath: result.backupPath ?? null
    } satisfies HookUninstallOutputInput;
    if (flag(args, '--json')) {
      io.print(JSON.stringify(hookJsonPayload(hookOutput), null, 2));
      return;
    }
    io.printLines(renderHookHumanLines(hookOutput));
    return;
  }
  throw new Error(hookUsageMessage());
}
