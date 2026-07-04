import { hookNextActions } from './guidance-actions.js';
import { renderGuidedNextCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type HookScope = 'project' | 'global';

export type HookUninstallOutputInput = {
  readonly action: 'uninstall';
  readonly scope: HookScope;
  readonly settingsPath: string;
  readonly backupPath: string | null;
};

export type HookOutputInput = HookUninstallOutputInput;

export type HookUninstallJsonPayload = {
  readonly target: typeof HOOK_TARGET;
  readonly action: 'uninstall';
  readonly scope: HookScope;
  readonly settings_path: string;
  readonly backup_path: string | null;
  readonly next_actions: readonly string[];
};

export type HookJsonPayload = HookUninstallJsonPayload;

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
  return {
    target: HOOK_TARGET,
    action: input.action,
    scope: input.scope,
    settings_path: input.settingsPath,
    backup_path: input.backupPath,
    next_actions: nextActions()
  };
}

export function renderHookHumanLines(input: HookOutputInput, style: HookOutputStyle = DEFAULT_STYLE): string[] {
  const lines = [
    style.heading(hookHeading()),
    hookMessage(),
    '',
    style.section('Summary'),
    `Target: ${HOOK_TARGET}`,
    `Action: ${input.action}`,
    `Scope: ${input.scope}`
  ];

  lines.push(`Settings: ${input.settingsPath}`);
  if (input.backupPath) lines.push(`Backup: ${input.backupPath}`);
  lines.push(
    '',
    style.section('Next'),
    ...renderGuidedNextCommandLines({ commands: nextActions(), command: style.command })
  );

  return lines;
}

function hookHeading(): string {
  return 'AgentFeed hook removed';
}

function hookMessage(): string {
  return 'Uninstalled legacy AgentFeed Claude Code hook.';
}

function nextActions(): string[] {
  return hookNextActions();
}
