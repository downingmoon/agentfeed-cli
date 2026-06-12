import type { CredentialResultView } from './auth-result.js';
import { formatTokenExpiry, formatWarningLines } from './diagnostic-formatters.js';
import * as ui from './ui.js';

export type CredentialOutputStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

const DEFAULT_STYLE: CredentialOutputStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

export function renderCredentialResultLines(options: CredentialResultView, style: CredentialOutputStyle = DEFAULT_STYLE): string[] {
  const lines = [
    style.heading(options.heading),
    options.message,
    '',
    style.section('Summary'),
    `Credentials: ${options.saved ? 'saved' : 'not saved'}`
  ];

  if (options.apiBaseUrl) lines.push(`API: ${options.apiBaseUrl}`);
  if (options.tokenExpiresAt) lines.push(`Token expires at: ${formatTokenExpiry(options.tokenExpiresAt)}`);
  if (options.warnings.length) {
    lines.push('', style.section('Warnings'));
    for (const warning of options.warnings) lines.push(...formatWarningLines(warning));
  }

  lines.push('', style.section('Next'));
  if (!options.saved) {
    lines.push('No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.');
  }
  lines.push(...nextActionLines(options, style));

  return lines;
}

function nextActionLines(options: CredentialResultView, style: CredentialOutputStyle): string[] {
  const commands = options.next.length ? options.next : ['agentfeed status'];
  return commands.map((command) => `  ${style.command(command)}`);
}
