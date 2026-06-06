import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('CLI review URL handoff trust policy', () => {
  it('validates review URL trust before clipboard or browser side effects', () => {
    const cli = source('src/cli/index.ts');
    const handoffStart = cli.indexOf('async function handoffReviewUrl');
    const handoffEnd = cli.indexOf('function reviewUrlHandoffLines');
    expect(handoffStart).toBeGreaterThanOrEqual(0);
    expect(handoffEnd).toBeGreaterThan(handoffStart);
    const rejectStart = cli.indexOf('function rejectReviewUrlHandoff');
    expect(rejectStart).toBeGreaterThanOrEqual(0);
    const handoff = cli.slice(rejectStart, handoffEnd);

    expect(handoff).toContain('isTrustedReviewUrl');
    expect(handoff.indexOf('isTrustedReviewUrl')).toBeLessThan(handoff.indexOf('copyToClipboard'));
    expect(handoff.indexOf('isTrustedReviewUrl')).toBeLessThan(handoff.indexOf('openBrowser'));
    expect(handoff).toContain('Review URL was rejected by trust policy');
  });

  it('passes the active API and review bases into every upload handoff call', () => {
    const cli = source('src/cli/index.ts');
    expect((cli.match(/handoffReviewUrl\(result\.review_url/g) ?? []).length).toBe(5);
    expect(cli).toContain('draft.upload.handoff = await handoffReviewUrl(result.review_url, { copy: false, open: true, apiBaseUrl: creds.api_base_url, reviewBaseUrl: result.review_base_url ?? metadata.review_base_url });');
    expect(cli).not.toContain('apiBaseUrl: creds!.api_base_url');
    expect((cli.match(/apiBaseUrl: creds\.api_base_url,\s*reviewBaseUrl: result\.review_base_url/g) ?? []).length).toBe(5);
    expect((cli.match(/reviewBaseUrl: result\.review_base_url/g) ?? []).length).toBe(5);
  });
});
