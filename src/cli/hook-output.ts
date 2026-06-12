import { hookNextActions, type HookLifecycleAction } from './guidance-actions.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type HookScope = 'project' | 'global';

export type HookInstallOutputInput = {
  readonly action: 'install';
  readonly scope: HookScope;
  readonly dryRun: boolean;
  readonly settingsPath: string;
  readonly backupPath: string | null;
};

export type HookUninstallOutputInput = {
  readonly action: 'uninstall';
  readonly scope: HookScope;
  readonly settingsPath: string;
  readonly backupPath: string | null;
};

export type HookOutputInput = HookInstallOutputInput | HookUninstallOutputInput;

export type HookInstallJsonPayload = {
  readonly target: typeof HOOK_TARGET;
  readonly action: 'install';
  readonly scope: HookScope;
  readonly dry_run: boolean;
  readonly settings_path: string;
  readonly backup_path: string | null;
  readonly next_actions: readonly string[];
};

export type HookUninstallJsonPayload = {
  readonly target: typeof HOOK_TARGET;
  readonly action: 'uninstall';
  readonly scope: HookScope;
  readonly settings_path: string;
  readonly backup_path: string | null;
  readonly next_actions: readonly string[];
};

export type HookJsonPayload = HookInstallJsonPayload | HookUninstallJsonPayload;

export type HookOutputStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

const HOOK_TARGET = 'claude-code' as const;
const DEFAULT_STYLE: HookOutputStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

export function hookJsonPayload(input: HookOutputInput): HookJsonPayload {
  const base = {
    target: HOOK_TARGET,
    action: input.action,
    scope: input.scope,
    settings_path: input.settingsPath,
    backup_path: input.backupPath,
    next_actions: nextActions(input)
  };

  if (input.action === 'install') {
    return {
      ...base,
      action: input.action,
      dry_run: input.dryRun
    };
  }

  return {
    ...base,
    action: input.action
  };
}

export function renderHookHumanLines(input: HookOutputInput, style: HookOutputStyle = DEFAULT_STYLE): string[] {
  const lines = [
    style.heading(hookHeading(input)),
    hookMessage(input),
    '',
    style.section('Summary'),
    `Target: ${HOOK_TARGET}`,
    `Action: ${input.action}`,
    `Scope: ${input.scope}`
  ];

  if (input.action === 'install') lines.push(`Dry run: ${input.dryRun ? 'yes' : 'no'}`);
  lines.push(`Settings: ${input.settingsPath}`);
  if (input.backupPath) lines.push(`Backup: ${input.backupPath}`);
  lines.push(
    '',
    style.section('Next'),
    ...renderGuidedNextCommandLines({ commands: nextActions(input), command: style.command })
  );

  return lines;
}

function hookHeading(input: HookOutputInput): string {
  if (input.action === 'uninstall') return 'AgentFeed hook removed';
  return input.dryRun ? 'AgentFeed hook dry run' : 'AgentFeed hook installed';
}

function hookMessage(input: HookOutputInput): string {
  if (input.action === 'uninstall') return 'Uninstalled AgentFeed Claude Code hook.';
  return `${input.dryRun ? 'Would install' : 'Installed'} AgentFeed Claude Code hook.`;
}

function nextActions(input: HookOutputInput): string[] {
  const dryRun = input.action === 'install' ? input.dryRun : false;
  return hookNextActions(input.action satisfies HookLifecycleAction, dryRun);
}
