import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('CLI review URL handoff trust policy', () => {
  it('validates review URL trust before clipboard or browser side effects', () => {
    const handoff = source('src/cli/review-handoff.ts');

    expect(handoff).toContain('isTrustedReviewUrl');
    expect(handoff.indexOf('isTrustedReviewUrl')).toBeLessThan(handoff.indexOf('copyToClipboard'));
    expect(handoff.indexOf('isTrustedReviewUrl')).toBeLessThan(handoff.indexOf('openBrowser'));
    expect(handoff).toContain('Review URL was rejected by trust policy');
  });

  it('keeps review URL handoff formatting in the handoff module', () => {
    const handoffFormatting = source('src/cli/review-handoff.ts');

    expect(handoffFormatting).toContain('export function reviewUrlHandoffLines');
    expect(handoffFormatting).toContain('Review URL copied to clipboard.');
    expect(handoffFormatting).toContain('Review URL opened in browser.');
    expect(handoffFormatting).toContain('Manual review URL:');
    expect(handoffFormatting).toContain('ui.command(reviewUrl)');
  });

  it('passes the active API and review bases into every upload handoff call', () => {
    const cli = source('src/cli/index.ts');
    const publishExecution = source('src/cli/publish-execution.ts');
    const shareUploadExecution = source('src/cli/share-upload-execution.ts');
    const collectUploadExecution = source('src/cli/collect-upload-execution.ts');
    const uploadHandoffSources = `${cli}\n${publishExecution}\n${shareUploadExecution}\n${collectUploadExecution}`;
    expect(cli).toContain('runCollectJsonUploadCommand');
    expect((publishExecution.match(/handoffReviewUrl\(upload\.review_url/g) ?? []).length).toBe(1);
    expect((shareUploadExecution.match(/handoffReviewUrl\(upload\.review_url/g) ?? []).length).toBe(1);
    expect((collectUploadExecution.match(/handoffReviewUrl\(upload\.review_url/g) ?? []).length).toBe(1);
    expect(publishExecution).toContain('apiBaseUrl: credentials.api_base_url,');
    expect(publishExecution).toContain('reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url');
    expect(shareUploadExecution).toContain('apiBaseUrl: options.credentials.api_base_url,');
    expect(shareUploadExecution).toContain('reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url');
    expect(collectUploadExecution).toContain('apiBaseUrl: options.credentials.api_base_url,');
    expect(collectUploadExecution).toContain('reviewBaseUrl: upload.review_base_url ?? metadata.review_base_url');
    const nonNullBang = String.fromCharCode(33);
    expect(uploadHandoffSources).not.toContain(`apiBaseUrl: creds${nonNullBang}.api_base_url`);
    expect((collectUploadExecution.match(/apiBaseUrl: options\.credentials\.api_base_url,\s*reviewBaseUrl: upload\.review_base_url/g) ?? []).length).toBe(1);
    expect((collectUploadExecution.match(/reviewBaseUrl: upload\.review_base_url/g) ?? []).length).toBe(1);
  });
});
