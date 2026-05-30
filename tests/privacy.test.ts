import { describe, expect, it } from 'vitest';
import { scanAndRedactFields } from '../src/privacy/scan.js';

describe('privacy scanner', () => {
  it.each([
    ['OpenAI key', 'sk-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Anthropic key', 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['email', 'dev@example.com', 'email_address'],
    ['localhost URL', 'http://localhost:3000/callback', 'private_url'],
    ['database URL', 'postgres://user:pass@localhost:5432/db', 'database_url']
  ])('detects %s', (_label, value, type) => {
    const result = scanAndRedactFields({ summary: `contains ${value}` });
    expect(result.scan.findings.some((f) => f.type === type)).toBe(true);
  });

  it('redacts absolute paths without adding leading whitespace', () => {
    const result = scanAndRedactFields({ summary: '/Users/downing/project/src/index.ts changed' });

    expect(result.redacted.summary).toBe('[REDACTED_PATH] changed');
    expect(result.scan.findings.some((f) => f.type === 'sensitive_path')).toBe(true);
  });

  it('redacts Windows absolute paths', () => {
    const result = scanAndRedactFields({ summary: 'Error at C:\\Users\\Downing\\project\\src\\index.ts changed' });

    expect(result.redacted.summary).toBe('Error at [REDACTED_PATH] changed');
    expect(result.scan.findings.some((f) => f.type === 'sensitive_path')).toBe(true);
  });

  it('redacts high severity secrets and marks danger', () => {
    const result = scanAndRedactFields({ title: 'Use sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890' });
    expect(result.redacted.title).toContain('[REDACTED_SECRET]');
    expect(result.scan.status).toBe('danger');
  });
});
