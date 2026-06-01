import type { PrivacyFinding, PrivacyScanResult } from '../types.js';
import { shortHash } from '../utils/hash.js';

type ScanInput = Record<string, unknown>;

interface PatternRule {
  type: PrivacyFinding['type'];
  severity: PrivacyFinding['severity'];
  regex: RegExp;
  replacement: string;
  message: string;
  sampleRedacted?: string;
}

const patterns: PatternRule[] = [
  { type: 'database_url', severity: 'high', regex: /\b(?:postgres|postgresql|mysql|mongodb|redis):\/\/[^\s'"<>]+/gi, replacement: '[REDACTED_DATABASE_URL]', message: 'Possible database URL detected.' },
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
  { type: 'email_address', severity: 'medium', regex: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, replacement: '[REDACTED_EMAIL]', message: 'Email address detected.' },
  { type: 'private_url', severity: 'medium', regex: /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[(?:::1|f[cd][0-9a-f]{2}:[0-9a-f:]+|fe80:[0-9a-f:]+)\])(?::\d+)?[^\s'"<>]*/gi, replacement: '[REDACTED_URL]', message: 'Private or localhost URL detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)[A-Za-z]:\\(?:[^\\\r\n/:*?"<>|]+\\){1,}[^\\\s\r\n/:*?"<>|]+/g, replacement: '[REDACTED_PATH]', message: 'Windows absolute local path detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)\\\\(?:[^\\\r\n/:*?"<>|]+\\){2,}[^\\\s\r\n/:*?"<>|]+/g, replacement: '[REDACTED_PATH]', message: 'UNC local path detected.' },
  { type: 'sensitive_path', severity: 'medium', regex: /(?<!\S)(?:~|\/)(?:[^/\r\n'"<>]+\/){1,}[^/\s\r\n'"<>]+/gu, replacement: '[REDACTED_PATH]', message: 'Absolute local path detected.' },
  { type: 'env_file_reference', severity: 'low', regex: /(?:^|\b)(?:\.env|id_rsa|credentials\.json)(?:\b|$)/gi, replacement: '[REDACTED_PATH]', message: 'Sensitive filename reference detected.' }
];

function flatten(input: ScanInput, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.push([field, value]);
    else if (Array.isArray(value)) value.forEach((item, i) => {
      if (typeof item === 'string') entries.push([`${field}.${i}`, item]);
      else if (item && typeof item === 'object') entries.push(...flatten(item as ScanInput, `${field}.${i}`));
    });
    else if (value && typeof value === 'object') entries.push(...flatten(value as ScanInput, field));
  }
  return entries;
}

function setDeep(target: Record<string, unknown>, dotted: string, value: string): void {
  const parts = dotted.split('.');
  let current: any = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = Array.isArray(current) ? Number(parts[i]) : parts[i];
    const next = parts[i + 1];
    if (current[part] == null) current[part] = /^\d+$/.test(next) ? [] : {};
    current = current[part];
  }
  current[Array.isArray(current) ? Number(parts.at(-1)!) : parts.at(-1)!] = value;
}

export function scanAndRedactFields<T extends ScanInput>(input: T): { scan: PrivacyScanResult; redacted: T } {
  const redacted = structuredClone(input) as T;
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
