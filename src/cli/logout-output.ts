import type { CredentialsDeleteResult } from '../config/credentials.js';
import { formatWarningLines } from './diagnostic-formatters.js';
import * as ui from './ui.js';

export type LogoutSecurityChecklistItem = {
  readonly name: string;
  readonly status: 'done' | 'attention';
  readonly detail: string;
  readonly next_action?: string;
};

export type LogoutOutputInput = {
  readonly result: CredentialsDeleteResult;
  readonly envTokenActive: boolean;
};

export type LogoutJsonPayload = {
  readonly credentials_file_deleted: boolean;
  readonly credentials_file_path: string;
  readonly keychain_deleted: boolean | null;
  readonly environment_token_active: boolean;
  readonly warnings: readonly string[];
  readonly security_checklist: readonly LogoutSecurityChecklistItem[];
  readonly next_actions: readonly string[];
};

const LOGOUT_NEXT_ACTIONS = ['agentfeed status'] as const;
const ENV_TOKEN_ACTIVE_WARNING = 'AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.';

type LogoutSecurityChecklistOptions = {
  readonly credentialsFileDeleted: boolean;
  readonly envTokenActive: boolean;
  readonly keychainDeleted?: boolean | null;
};

export function logoutSecurityChecklist(options: LogoutSecurityChecklistOptions): LogoutSecurityChecklistItem[] {
  const items: LogoutSecurityChecklistItem[] = [
    options.credentialsFileDeleted
      ? { name: 'Saved credentials', status: 'done', detail: 'removed from this machine' }
      : { name: 'Saved credentials', status: 'done', detail: 'no saved credentials found' },
    options.envTokenActive
      ? { name: 'Environment token', status: 'attention', detail: 'AGENTFEED_TOKEN is still active in this shell', next_action: 'unset AGENTFEED_TOKEN' }
      : { name: 'Environment token', status: 'done', detail: 'not set in this shell' }
  ];
  if (options.keychainDeleted === true) items.splice(1, 0, { name: 'OS keychain token', status: 'done', detail: 'removed' });
  if (options.keychainDeleted === false) items.splice(1, 0, { name: 'OS keychain token', status: 'attention', detail: 'not removed', next_action: 'agentfeed logout' });
  return items;
}

export function logoutWarnings(input: LogoutOutputInput): string[] {
  return [
    ...input.result.warnings,
    ...(input.envTokenActive ? [ENV_TOKEN_ACTIVE_WARNING] : [])
  ];
}

export function logoutJsonPayload(input: LogoutOutputInput): LogoutJsonPayload {
  return {
    credentials_file_deleted: input.result.credentials_file_deleted,
    credentials_file_path: input.result.credentials_file_path,
    keychain_deleted: input.result.keychain_deleted,
    environment_token_active: input.envTokenActive,
    warnings: logoutWarnings(input),
    security_checklist: logoutSecurityChecklist({
      credentialsFileDeleted: input.result.credentials_file_deleted,
      envTokenActive: input.envTokenActive,
      keychainDeleted: input.result.keychain_deleted
    }),
    next_actions: LOGOUT_NEXT_ACTIONS
  };
}

export function renderLogoutHumanLines(input: LogoutOutputInput): string[] {
  const lines = [
    ui.heading('AgentFeed logout complete'),
    input.result.credentials_file_deleted ? 'AgentFeed saved credentials removed.' : 'No saved AgentFeed credentials were found.',
    '',
    ui.section('Summary'),
    `Credentials file: ${input.result.credentials_file_deleted ? 'removed' : 'not found'}`,
    ...logoutKeychainSummaryLines(input.result.keychain_deleted)
  ];
  const warnings = logoutWarnings(input);
  if (warnings.length) {
    lines.push('', ui.section('Warnings'), ...warnings.flatMap((warning) => formatWarningLines(warning)));
  }
  lines.push(
    '',
    ...renderLogoutSecurityChecklistLines(logoutSecurityChecklist({
      credentialsFileDeleted: input.result.credentials_file_deleted,
      envTokenActive: input.envTokenActive,
      keychainDeleted: input.result.keychain_deleted
    })),
    '',
    ui.section('Next'),
    `  ${ui.command('agentfeed status')}`
  );
  return lines;
}

function logoutKeychainSummaryLines(keychainDeleted: boolean | null): string[] {
  if (keychainDeleted === true) return ['OS keychain token removed.'];
  if (keychainDeleted === false) return ['OS keychain token: not removed'];
  return [];
}

function renderLogoutSecurityChecklistLines(items: readonly LogoutSecurityChecklistItem[]): string[] {
  return [
    ui.section('Security checklist'),
    ...items.map((item) => {
      const next = item.next_action ? ` → ${item.next_action}` : '';
      return `${logoutChecklistMarker(item.status)} ${item.name}: ${item.detail}${next}`;
    })
  ];
}

function logoutChecklistMarker(status: LogoutSecurityChecklistItem['status']): string {
  return status === 'done' ? ui.good('✓') : ui.warn('!');
}
