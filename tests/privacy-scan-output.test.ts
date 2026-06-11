import { describe, expect, it } from 'vitest';
import { scanAndRedactFields } from '../src/privacy/scan.js';
import { formatPrivacyScanReport, privacyScanJsonOutput } from '../src/cli/privacy-scan-output.js';

const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';

describe('privacy scan output helpers', () => {
  it('builds path scan JSON with redacted previews and next actions', () => {
    // Given: public scan fields containing a secret in a path scan.
    const input = { title: `Deploy with ${secret}` };
    const result = scanAndRedactFields(input);

    // When: the CLI scan JSON payload is assembled.
    const output = privacyScanJsonOutput(input, result, { path: 'public.json' });

    // Then: machine-readable output stays free of human headings and records inspect-only guidance.
    expect(output).toMatchObject({
      dry_run: false,
      mode: 'inspect_only',
      target: { type: 'path', path: 'public.json' },
      saved: false,
      redacted_fields: [{ field: 'title', value: 'Deploy with [REDACTED_SECRET]' }],
      next_actions: ['agentfeed collect --explain']
    });
    expect(output.scan.status).toBe('danger');
  });

  it('formats a human path scan report without leaking secrets', () => {
    // Given: public scan fields containing a secret in a path scan.
    const input = { title: `Deploy with ${secret}` };
    const result = scanAndRedactFields(input);

    // When: the CLI scan report is rendered for humans.
    const report = formatPrivacyScanReport(input, result.redacted, result.scan, { path: 'public.json' });

    // Then: the report explains inspect-only behavior, redaction preview, and safe next actions.
    expect(report).toContain('AgentFeed privacy scan');
    expect(report).toContain('Target: path public.json');
    expect(report).toContain('Mode: inspect only');
    expect(report).toContain('Path scan: inspect only; no draft was modified.');
    expect(report).toContain('Findings detail');
    expect(report).toContain('[high] api_key_pattern at title -> [REDACTED_SECRET]');
    expect(report).toContain('Redacted preview');
    expect(report).toContain('- title: Deploy with [REDACTED_SECRET]');
    expect(report).toContain('Next');
    expect(report).toContain('agentfeed collect --explain');
    expect(report).not.toContain(secret);
  });
});
