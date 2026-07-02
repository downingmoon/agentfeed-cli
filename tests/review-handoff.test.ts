import { describe, expect, it } from 'vitest';
import { handoffReviewUrl, shouldCopyReviewUrl } from '../src/cli/review-handoff.js';

describe('review URL handoff helpers', () => {
  it('keeps JSON mode clipboard side effects explicit-only', () => {
    // Given: CLI upload can run in human or machine-readable modes.
    // Then: JSON mode copies only when --clipboard is explicit; human mode copies unless disabled.
    expect(shouldCopyReviewUrl({ json: true })).toBe(false);
    expect(shouldCopyReviewUrl({ json: true, clipboard: true })).toBe(true);
    expect(shouldCopyReviewUrl({ json: true, clipboard: true, noClipboard: true })).toBe(false);
    expect(shouldCopyReviewUrl({})).toBe(true);
    expect(shouldCopyReviewUrl({ noClipboard: true })).toBe(false);
  });

  it('rejects untrusted review URLs before clipboard or browser side effects', async () => {
    // Given: the backend returned a review URL outside the trusted API/review origin.
    const calls: string[] = [];

    // When: both side effects are requested for that untrusted URL.
    const handoff = await handoffReviewUrl('https://evil.example/worklogs/worklog_bad/review', {
      copy: true,
      open: true,
      apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1',
      reviewBaseUrl: 'https://agentfeed.downingmoon.dev',
      copyToClipboard: async () => {
        calls.push('copy');
        return true;
      },
      openBrowser: async () => {
        calls.push('open');
        return true;
      }
    });

    // Then: no side effect runs, but requested channels report trust-policy rejection.
    expect(calls).toEqual([]);
    expect(handoff.clipboard).toMatchObject({ requested: true, ok: false });
    expect(handoff.browser).toMatchObject({ requested: true, ok: false });
    expect(handoff.clipboard.warning).toContain('Review URL was rejected by trust policy');
    expect(handoff.browser.warning).toContain('Review URL was rejected by trust policy');
  });

  it('records requested side effect success and failure without throwing', async () => {
    // Given: a trusted review URL and side effect adapters with mixed outcomes.
    const calls: string[] = [];

    // When: clipboard succeeds and browser opening fails.
    const handoff = await handoffReviewUrl('https://agentfeed.downingmoon.dev/worklogs/worklog_ok/review', {
      copy: true,
      open: true,
      apiBaseUrl: 'https://agentfeed.api.downingmoon.dev/v1',
      reviewBaseUrl: 'https://agentfeed.downingmoon.dev',
      copyToClipboard: async (reviewUrl) => {
        calls.push(`copy:${reviewUrl}`);
        return true;
      },
      openBrowser: async (reviewUrl) => {
        calls.push(`open:${reviewUrl}`);
        return false;
      }
    });

    // Then: both requested channels are represented in the handoff payload.
    expect(calls).toEqual([
      'copy:https://agentfeed.downingmoon.dev/worklogs/worklog_ok/review',
      'open:https://agentfeed.downingmoon.dev/worklogs/worklog_ok/review'
    ]);
    expect(handoff.clipboard).toEqual({ requested: true, ok: true });
    expect(handoff.browser).toEqual({
      requested: true,
      ok: false,
      warning: 'Review URL could not be opened automatically. Open the review URL manually.'
    });
  });
});
