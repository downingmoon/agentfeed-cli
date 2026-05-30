import { describe, expect, it } from 'vitest';
import { scanAndRedactFields } from '../src/privacy/scan.js';

describe('privacy scanner', () => {
  it.each([
    ['OpenAI key', 'sk-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Anthropic key', 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['AgentFeed token', 'af_live_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Discord bot token', 'MTAwMDAwMDAwMDAwMDAwMDAw.XyZ_12.abcdefghijklmnopqrstuvwxyz1', 'api_key_pattern'],
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

  it.each([
    ['/Users/John Doe/Private Repo/src/index.ts changed', '[REDACTED_PATH] changed'],
    ['/home/alice/My Project/src/index.ts changed', '[REDACTED_PATH] changed'],
    ['/Users/다운닝/비밀 프로젝트/src/index.ts changed', '[REDACTED_PATH] changed'],
    ['Error at C:\\Users\\Jane Doe\\Private Repo\\src\\index.ts changed', 'Error at [REDACTED_PATH] changed'],
    ['Error at \\\\server\\share\\Private Repo\\src\\index.ts changed', 'Error at [REDACTED_PATH] changed']
  ])('redacts local paths with spaces and unicode: %s', (input, expected) => {
    const result = scanAndRedactFields({ summary: input });

    expect(result.redacted.summary).toBe(expected);
    expect(result.scan.findings.some((f) => f.type === 'sensitive_path')).toBe(true);
  });

  it('redacts Discord bot token-like secrets from public text fields', () => {
    const discordToken = 'MTAwMDAwMDAwMDAwMDAwMDAw.XyZ_12.abcdefghijklmnopqrstuvwxyz1';
    const result = scanAndRedactFields({
      summary: `Rotate Discord bot token ${discordToken}`,
      user_note: `Accidentally pasted ${discordToken}`,
      public_prompt: `Use token=${discordToken}`
    });

    expect(result.redacted.summary).toBe('Rotate Discord bot token [REDACTED_SECRET]');
    expect(result.redacted.user_note).toBe('Accidentally pasted [REDACTED_SECRET]');
    expect(result.redacted.public_prompt).toBe('Use token=[REDACTED_SECRET]');
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings).toHaveLength(3);
    expect(result.scan.findings.every((finding) =>
      finding.type === 'api_key_pattern' &&
      finding.severity === 'high' &&
      finding.resolved === true &&
      finding.resolution === 'redacted' &&
      finding.sample_redacted === '[REDACTED_SECRET]' &&
      finding.message === 'Possible Discord bot token detected.'
    )).toBe(true);
  });

  it('does not flag arbitrary dotted identifiers as Discord bot tokens', () => {
    const result = scanAndRedactFields({ summary: 'Release package-name@1.2.3 and docs section abcdefghijklmnopqrstuvwx.abcdef.short' });

    expect(result.redacted.summary).toBe('Release package-name@1.2.3 and docs section abcdefghijklmnopqrstuvwx.abcdef.short');
    expect(result.scan.findings).toHaveLength(0);
    expect(result.scan.status).toBe('safe');
  });

  it('redacts high severity secrets and marks danger', () => {
    const result = scanAndRedactFields({ title: 'Use sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890' });
    expect(result.redacted.title).toContain('[REDACTED_SECRET]');
    expect(result.scan.status).toBe('danger');
  });
});
