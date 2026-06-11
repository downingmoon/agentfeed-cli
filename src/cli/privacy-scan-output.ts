import type { PrivacyScanResult } from '../types.js';
import type { PublicScanFields } from '../privacy/draft-sanitizer.js';
import { privacyScanNextActions } from './guidance-actions.js';
import * as ui from './ui.js';

export type PrivacyScanOutputOptions = {
  readonly dryRun?: boolean;
  readonly draftId?: string;
  readonly path?: string;
};

type PrivacyScanTarget =
  | { readonly type: 'draft'; readonly id: string }
  | { readonly type: 'path'; readonly path: string }
  | { readonly type: 'input' };

type PrivacyScanMode = 'dry_run' | 'redact_and_save' | 'inspect_only';

type PrivacyScanResultBundle = {
  readonly scan: PrivacyScanResult;
  readonly redacted: PublicScanFields;
};

export type RedactedFieldPreview = {
  readonly field: string;
  readonly value: string;
};

export type PrivacyScanJsonOutput = {
  readonly dry_run: boolean;
  readonly mode: PrivacyScanMode;
  readonly target: PrivacyScanTarget;
  readonly saved: boolean;
  readonly scan: PrivacyScanResult;
  readonly redacted_fields: readonly RedactedFieldPreview[];
  readonly next_actions: readonly string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flattenStringFields(input: Record<string, unknown>, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.push([field, value]);
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'string') entries.push([`${field}.${index}`, item]);
        else if (isRecord(item)) entries.push(...flattenStringFields(item, `${field}.${index}`));
      });
    } else if (isRecord(value)) {
      entries.push(...flattenStringFields(value, field));
    }
  }
  return entries;
}

function safeTerminalText(value: string | null | undefined): string {
  return ui.sanitizeTerminalText(value ?? '');
}

function singleLine(value: string): string {
  const text = safeTerminalText(value).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export function redactedFieldPreviews(original: PublicScanFields, redacted: PublicScanFields): readonly RedactedFieldPreview[] {
  const originalFields = new Map(flattenStringFields(original));
  return flattenStringFields(redacted)
    .filter(([field, value]) => originalFields.get(field) !== value)
    .map(([field, value]) => ({ field, value: singleLine(value) }));
}

function privacyScanTarget(options: PrivacyScanOutputOptions): PrivacyScanTarget {
  if (options.draftId) return { type: 'draft', id: options.draftId };
  if (options.path) return { type: 'path', path: options.path };
  return { type: 'input' };
}

function privacyScanMode(options: PrivacyScanOutputOptions): PrivacyScanMode {
  if (!options.draftId) return 'inspect_only';
  return options.dryRun ? 'dry_run' : 'redact_and_save';
}

export function privacyScanJsonOutput(
  input: PublicScanFields,
  result: PrivacyScanResultBundle,
  options: PrivacyScanOutputOptions = {}
): PrivacyScanJsonOutput {
  return {
    dry_run: Boolean(options.dryRun),
    mode: privacyScanMode(options),
    target: privacyScanTarget(options),
    saved: Boolean(options.draftId && !options.dryRun),
    scan: result.scan,
    redacted_fields: redactedFieldPreviews(input, result.redacted),
    next_actions: privacyScanNextActions(options)
  };
}

export function formatPrivacyScanReport(
  input: PublicScanFields,
  redacted: PublicScanFields,
  scan: PrivacyScanResult,
  options: PrivacyScanOutputOptions = {}
): string {
  const target = options.draftId ? `draft ${options.draftId}` : options.path ? `path ${options.path}` : 'current input';
  const mode = options.draftId
    ? (options.dryRun ? 'dry run' : 'redact and save')
    : 'inspect only';
  const result = scan.findings.length
    ? 'Sensitive public fields found; review redactions before sharing.'
    : 'No public-field findings detected.';
  const lines = [
    ui.heading('AgentFeed privacy scan'),
    '',
    ui.section('Summary'),
    `Target: ${target}`,
    `Mode: ${mode}`,
    `Privacy: ${scan.status}`,
    `Findings: ${scan.findings.length}`,
    `Result: ${result}`
  ];
  if (options.draftId) {
    if (options.dryRun) {
      lines.push('Dry run: draft not modified.');
    } else if (scan.findings.length) {
      lines.push('Saved: redacted public fields were written to the local draft.');
    } else {
      lines.push('Saved: privacy scan result was written to the local draft.');
    }
  }
  if (options.path) lines.push('Path scan: inspect only; no draft was modified.');
  if (scan.findings.length) {
    lines.push('', ui.section('Findings detail'));
    for (const finding of scan.findings) {
      lines.push(`- [${safeTerminalText(finding.severity)}] ${safeTerminalText(finding.type)}${finding.field ? ` at ${safeTerminalText(finding.field)}` : ''} -> ${safeTerminalText(finding.sample_redacted ?? '[REDACTED]')}`);
    }
  } else {
    lines.push('', ui.section('Findings detail'));
    lines.push('No findings detected.');
  }
  const previews = redactedFieldPreviews(input, redacted);
  if (previews.length) {
    lines.push('', ui.section('Redacted preview'));
    for (const preview of previews) lines.push(`- ${safeTerminalText(preview.field)}: ${safeTerminalText(preview.value)}`);
  } else {
    lines.push('', ui.section('Redacted preview'));
    lines.push('No redactions needed.');
  }
  lines.push('', ui.section('Next'));
  for (const command of privacyScanNextActions(options)) {
    lines.push(`  ${ui.command(command)}`);
  }
  return lines.join('\n');
}
