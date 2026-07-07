import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { applyRedactedPublicFields } from '../src/privacy/draft-sanitizer.js';
import { scanAndRedactFields } from '../src/privacy/scan.js';

describe('privacy scanner', () => {

  it('rejects malformed redacted public fields instead of mutating the draft', () => {
    // Given: a valid local draft and a malformed redaction payload at the public-field boundary.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: '/tmp/proj', source: 'codex' });
    const originalOutcome = [...draft.worklog.outcome];

    // When / Then: applying the malformed payload raises a clear error and leaves the draft intact.
    expect(() => applyRedactedPublicFields(draft, { outcome: ['Reviewed code', 42] })).toThrow(
      'Invalid redacted public field outcome: expected an array of strings.'
    );
    expect(draft.worklog.outcome).toEqual(originalOutcome);
  });


  it('redacts nested array and object public fields without changing sibling values', () => {
    const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';
    const result = scanAndRedactFields({
      timeline: [
        { order: 1, title: `Used ${secret}`, status: 'success' },
        { order: 2, title: 'Left untouched', description: `Path /Users/downing/private/file.ts` }
      ],
      metrics: {
        agent_modes: [`mode-${secret}`, 'safe-mode'],
        tokens_used: 10
      }
    });

    expect(result.redacted.timeline).toEqual([
      { order: 1, title: 'Used [REDACTED_SECRET]', status: 'success' },
      { order: 2, title: 'Left untouched', description: 'Path [REDACTED_PATH]' }
    ]);
    expect(result.redacted.metrics).toEqual({
      agent_modes: ['mode-[REDACTED_SECRET]', 'safe-mode'],
      tokens_used: 10
    });
    expect(result.scan.status).toBe('danger');
  });

  it('classifies email addresses as high severity because public fields can expose third-party personal data', () => {
    // Given: a public worklog field contains an email address.
    const result = scanAndRedactFields({ summary: 'Contact dev@example.com before launch' });

    // Then: CLI publish safety matches the backend server-side publish gate.
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings).toEqual([expect.objectContaining({ type: 'email_address', severity: 'high' })]);
    expect(result.redacted.summary).toBe('Contact [REDACTED_EMAIL] before launch');
  });

  it.each([
    ['OpenAI key', 'sk-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Anthropic key', 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['AgentFeed token', 'af_live_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['GitHub token', 'ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['GitHub fine-grained token', 'github_pat_11ABCDEFG0abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['GitLab token', 'glpat-abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Hugging Face token', 'hf_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['Stripe live secret key', 'sk_live_abcdefghijklmnopqrstuvwxyz1234567890', 'api_key_pattern'],
    ['npm token', 'npm_abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJ', 'api_key_pattern'],
    ['Slack token', 'xoxb-123456789012-123456789012-abcdefghijklmnopqrstuvwxyz', 'api_key_pattern'],
    ['Discord bot token', 'MTAwMDAwMDAwMDAwMDAwMDAw.XyZ_12.abcdefghijklmnopqrstuvwxyz1', 'api_key_pattern'],
    ['email', 'dev@example.com', 'email_address'],
    ['localhost URL', 'http://localhost:3000/callback', 'private_url'],
    ['database URL', 'postgres://user:pass@localhost:5432/db', 'database_url']
  ])('detects %s', (_label, value, type) => {
    const result = scanAndRedactFields({ summary: `contains ${value}` });
    expect(result.scan.findings.some((f) => f.type === type)).toBe(true);
  });

  it.each([
    ['rediss URL', 'rediss://:password@cache.example.com:6380/0'],
    ['mongodb+srv URL', 'mongodb+srv://user:password@cluster.example.com/app'],
    ['mongodb+srv URL with query', 'mongodb+srv://user:password@cluster.example.com/app?retryWrites=true&w=majority']
  ])('redacts high severity sensitive service URL classes: %s', (_label, url) => {
    const result = scanAndRedactFields({ summary: `configured ${url}` });

    expect(result.redacted.summary).toBe('configured [REDACTED_DATABASE_URL]');
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings.some((f) => f.type === 'database_url' && f.severity === 'high')).toBe(true);
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
    const discordFindings = result.scan.findings.filter((finding) => finding.message === 'Possible Discord bot token detected.');
    expect(discordFindings).toHaveLength(3);
    expect(discordFindings.every((finding) =>
      finding.type === 'api_key_pattern' &&
      finding.severity === 'high' &&
      finding.resolved === true &&
      finding.resolution === 'redacted' &&
      finding.sample_redacted === '[REDACTED_SECRET]'
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

  it.each([
    ['DATABASE_PASSWORD=swordfish-secret', 'DATABASE_PASSWORD=[REDACTED_SECRET]'],
    ['api_key: "abcdef1234567890"', 'api_key: "[REDACTED_SECRET]"'],
    ['refresh-token=abcdef1234567890', 'refresh-token=[REDACTED_SECRET]']
  ])('redacts secret assignments while preserving the setting name: %s', (input, expected) => {
    const result = scanAndRedactFields({ summary: input });

    expect(result.redacted.summary).toBe(expected);
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings.some((finding) =>
      finding.type === 'api_key_pattern' &&
      finding.sample_redacted === '[REDACTED_SECRET]' &&
      finding.message === 'Possible secret assignment detected.'
    )).toBe(true);
  });

  it('redacts PEM private key blocks from public text fields', () => {
    const result = scanAndRedactFields({
      summary: 'Key:\n-----BEGIN PRIVATE KEY-----\nabcdefghijklmnopqrstuvwxyz1234567890\n-----END PRIVATE KEY-----\nDone'
    });

    expect(result.redacted.summary).toBe('Key:\n[REDACTED_SECRET]\nDone');
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings.some((finding) => finding.message === 'Possible private key block detected.')).toBe(true);
  });

  it.each([
    ['Authorization: Bearer abcdef1234567890abcdef1234567890', 'Authorization: Bearer [REDACTED_SECRET]'],
    ['authorization: Basic dXNlcjpwYXNzd29yZA==', 'authorization: Basic [REDACTED_SECRET]'],
    ['Authorization: Token ghp_abcdefghijklmnopqrstuvwxyz1234567890', 'Authorization: Token [REDACTED_SECRET]'],
    ['"Authorization":"Bearer abcdef1234567890abcdef1234567890"', '"Authorization":"Bearer [REDACTED_SECRET]"']
  ])('redacts secret-bearing authorization headers: %s', (input, expected) => {
    const result = scanAndRedactFields({ summary: input });

    expect(result.redacted.summary).toBe(expected);
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings.some((finding) =>
      finding.type === 'api_key_pattern' &&
      finding.message === 'Possible Authorization header secret detected.'
    )).toBe(true);
  });

  it.each([
    ['https://user:pass@example.com/repo.git'],
    ['http://token@example.com/path?x=1']
  ])('redacts credentialed public URLs: %s', (url) => {
    const result = scanAndRedactFields({ summary: `Remote ${url}` });

    expect(result.redacted.summary).toBe('Remote [REDACTED_URL]');
    expect(result.scan.status).toBe('danger');
    expect(result.scan.findings.some((finding) =>
      finding.type === 'private_url' &&
      finding.message === 'Credentialed URL detected.'
    )).toBe(true);
  });

  it.each([
    ['http://169.254.169.254/latest/meta-data/'],
    ['http://127.1.2.3:3000/callback'],
    ['http://0.0.0.0:3000/callback'],
    ['http://100.64.1.2/internal'],
    ['http://[::1]:3000/callback'],
    ['http://[::]/internal'],
    ['https://[fd00::1]/internal'],
    ['https://[fe80::1]/metadata'],
    ['http://[::ffff:127.0.0.1]/private'],
    ['http://[::ffff:7f00:1]/private']
  ])('redacts IPv6 and link-local private URLs: %s', (url) => {
    const result = scanAndRedactFields({ summary: `Fetched ${url}` });

    expect(result.redacted.summary).toBe('Fetched [REDACTED_URL]');
    expect(result.scan.findings.some((finding) =>
      finding.type === 'private_url' &&
      finding.message === 'Private or localhost URL detected.'
    )).toBe(true);
  });
});
