import type { PrivacyFinding, PrivacyScanResult } from '../types.js';
import { shortHash } from '../utils/hash.js';

type ScanInput = Record<string, unknown>;
type RedactionContainer = Record<string, unknown> | unknown[];

interface PatternRule {
  type: PrivacyFinding['type'];
  severity: PrivacyFinding['severity'];
  regex: RegExp;
  replacement: string;
  message: string;
  sampleRedacted?: string;
}

const patterns: PatternRule[] = [
  { type: 'database_url', severity: 'high', regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis|rediss):\/\/[^\s'"<>]+/gi, replacement: '[REDACTED_DATABASE_URL]', message: 'Possible database URL detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\b(["']?Authorization["']?\s*:\s*["']?(?:Bearer|Basic|Token)\s+)[A-Za-z0-9._~+/=-]{8,}(["']?)/gi, replacement: '$1[REDACTED_SECRET]$2', sampleRedacted: '[REDACTED_SECRET]', message: 'Possible Authorization header secret detected.' },
  { type: 'private_url', severity: 'high', regex: /\bhttps?:\/\/(?:[^:\s'"<>/@]+(?::[^@\s'"<>/]*)?|[^@\s'"<>/]+)@[^\s'"<>]+/gi, replacement: '[REDACTED_URL]', message: 'Credentialed URL detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/gi, replacement: '[REDACTED_SECRET]', message: 'Possible Anthropic API key detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\bsk-[A-Za-z0-9_-]{20,}\b/gi, replacement: '[REDACTED_SECRET]', message: 'Possible API key detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\baf_(?:live|test|dev)_[A-Za-z0-9_-]{8,}\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible AgentFeed token detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\b(?:(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|hf_[A-Za-z0-9]{20,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{20,})\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible token detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\bnpm_[A-Za-z0-9]{36,}\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible npm token detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible Slack token detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\b[MN][A-Za-z0-9_-]{23}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible Discord bot token detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, replacement: '[REDACTED_SECRET]', message: 'Possible JWT detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replacement: '[REDACTED_SECRET]', message: 'Possible private key block detected.' },
  { type: 'api_key_pattern', severity: 'high', regex: /\b((?:[A-Z][A-Z0-9_]*_)?(?:API[_-]?KEY|SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE[_-]?KEY|ACCESS[_-]?TOKEN|REFRESH[_-]?TOKEN)\s*[:=]\s*)(["']?)[^\s'"`<>]{8,}\2/gi, replacement: '$1$2[REDACTED_SECRET]$2', sampleRedacted: '[REDACTED_SECRET]', message: 'Possible secret assignment detected.' },
  { type: 'email_address', severity: 'high', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]', message: 'Email address detected.' },
  { type: 'private_url', severity: 'medium', regex: /https?:\/\/(?:localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|10\.\d+\.\d+\.\d+|100\.(?:6[4-9]|[78]\d|9\d|1[01]\d|12[0-7])\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[(?:::|::1|::ffff:(?:127(?:\.\d{1,3}){3}|7f[0-9a-f]{2}:[0-9a-f]{1,4})|f[cd][0-9a-f]{2}:[0-9a-f:]+|fe80:[0-9a-f:]+)\])(?::\d+)?[^\s'"<>]*/gi, replacement: '[REDACTED_URL]', message: 'Private or localhost URL detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)[A-Za-z]:\\(?:[^\\\r\n/:*?"<>|]+\\){1,}[^\\\s\r\n/:*?"<>|]+/g, replacement: '[REDACTED_PATH]', message: 'Windows absolute local path detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)\\\\(?:[^\\\r\n/:*?"<>|]+\\){2,}[^\\\s\r\n/:*?"<>|]+/g, replacement: '[REDACTED_PATH]', message: 'UNC local path detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)(?:~|\/)(?:[^/\r\n'"<>]+\/){1,}[^/\s\r\n'"<>]+/gu, replacement: '[REDACTED_PATH]', message: 'Absolute local path detected.' },
  { type: 'env_file_reference', severity: 'low', regex: /(?:^|\b)(?:\.env|id_rsa|credentials\.json)(?:\b|$)/gi, replacement: '[REDACTED_PATH]', message: 'Sensitive filename reference detected.' }
];

function isScanInput(value: unknown): value is ScanInput {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function flatten(input: ScanInput, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.push([field, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => {
      if (typeof item === 'string') entries.push([`${field}.${index}`, item]);
      else if (isScanInput(item)) entries.push(...flatten(item, `${field}.${index}`));
    });
    else if (isScanInput(value)) entries.push(...flatten(value, field));
  }
  return entries;
}

function numericSegment(segment: string): number | null {
  if (!/^\d+$/.test(segment)) return null;
  return Number(segment);
}

function childFor(container: RedactionContainer, segment: string): unknown {
  if (!Array.isArray(container)) return container[segment];
  const index = numericSegment(segment);
  return index === null ? undefined : container[index];
}

function setChild(container: RedactionContainer, segment: string, value: unknown): void {
  if (!Array.isArray(container)) {
    container[segment] = value;
    return;
  }
  const index = numericSegment(segment);
  if (index === null) throw new Error(`Invalid redaction array path segment: ${segment}`);
  container[index] = value;
}

function isRedactionContainer(value: unknown): value is RedactionContainer {
  return Array.isArray(value) || isScanInput(value);
}

function containerFor(nextSegment: string): RedactionContainer {
  return numericSegment(nextSegment) === null ? {} : [];
}

function setDeep(target: Record<string, unknown>, dotted: string, value: string): void {
  const parts = dotted.split('.');
  let current: RedactionContainer = target;
  for (let index = 0; index < parts.length; index += 1) {
    const segment = parts[index];
    if (segment === undefined) throw new Error(`Invalid redaction path: ${dotted}`);
    const isLeaf = index === parts.length - 1;
    if (isLeaf) {
      setChild(current, segment, value);
      return;
    }
    const nextSegment = parts[index + 1];
    if (nextSegment === undefined) throw new Error(`Invalid redaction path: ${dotted}`);
    const existing = childFor(current, segment);
    if (isRedactionContainer(existing)) {
      current = existing;
      continue;
    }
    const created = containerFor(nextSegment);
    setChild(current, segment, created);
    current = created;
  }
}

export function scanAndRedactFields<T extends ScanInput>(input: T): { scan: PrivacyScanResult; redacted: T } {
  const redacted: T = structuredClone(input);
  const findings: PrivacyFinding[] = [];
  for (const [field, value] of flatten(input)) {
    let replaced = value;
    for (const pattern of patterns) {
      pattern.regex.lastIndex = 0;
      const matches = [...value.matchAll(pattern.regex)];
      for (const match of matches) {
        const sample = match[0];
        findings.push({
          id: `finding_${shortHash(`${pattern.type}:${field}:${sample}`, 8)}`,
          type: pattern.type,
          severity: pattern.severity,
          message: pattern.message,
          field,
          sample_redacted: pattern.sampleRedacted ?? pattern.replacement,
          resolved: true,
          resolution: 'redacted'
        });
      }
      replaced = replaced.replace(pattern.regex, pattern.replacement);
    }
    if (replaced !== value) setDeep(redacted, field, replaced);
  }
  const status = findings.some((f) => f.severity === 'high') ? 'danger' : findings.length ? 'warning' : 'safe';
  return { redacted, scan: { status, findings } };
}
