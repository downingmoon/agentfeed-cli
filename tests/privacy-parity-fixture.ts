import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { PrivacyFinding, PrivacyStatus } from '../src/types.js';

export type PrivacyScannerParityCase = {
  readonly label: string;
  readonly value: string;
  readonly type: PrivacyFinding['type'];
  readonly severity: PrivacyFinding['severity'];
  readonly cliStatus: PrivacyStatus;
  readonly serverStatus: PrivacyStatus;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireStringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Invalid privacy scanner parity fixture field: ${field}`);
  return value;
}

function parseFindingType(value: unknown): PrivacyFinding['type'] {
  switch (value) {
    case 'possible_secret':
    case 'private_url':
    case 'email_address':
    case 'api_key_pattern':
    case 'env_file_reference':
    case 'sensitive_path':
    case 'database_url':
    case 'other':
      return value;
    default:
      throw new Error(`Invalid privacy scanner parity fixture type: ${String(value)}`);
  }
}

function parseSeverity(value: unknown): PrivacyFinding['severity'] {
  switch (value) {
    case 'info':
    case 'low':
    case 'medium':
    case 'high':
    case 'critical':
    case 'unknown':
      return value;
    default:
      throw new Error(`Invalid privacy scanner parity fixture severity: ${String(value)}`);
  }
}

function parseStatus(value: unknown): PrivacyStatus {
  switch (value) {
    case 'safe':
    case 'warning':
    case 'danger':
      return value;
    default:
      throw new Error(`Invalid privacy scanner parity fixture status: ${String(value)}`);
  }
}

function parsePrivacyScannerParityCase(value: unknown): PrivacyScannerParityCase {
  if (!isRecord(value)) throw new Error('Invalid privacy scanner parity fixture case.');
  return {
    label: requireStringField(value, 'label'),
    value: requireStringField(value, 'value'),
    type: parseFindingType(value.type),
    severity: parseSeverity(value.severity),
    cliStatus: parseStatus(value.cliStatus),
    serverStatus: parseStatus(value.serverStatus)
  };
}

export function loadPrivacyScannerParityCases(): readonly PrivacyScannerParityCase[] {
  const fixturePath = fileURLToPath(new URL('../../agentfeed-dev/contracts/privacy-scanner-parity-cases.json', import.meta.url));
  const parsed: unknown = JSON.parse(readFileSync(fixturePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Privacy scanner parity fixture must be an array.');
  return parsed.map(parsePrivacyScannerParityCase);
}
