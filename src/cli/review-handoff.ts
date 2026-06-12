import type { ReviewUrlHandoff } from '../types.js';
import { isTrustedReviewUrl } from '../api/client.js';
import { copyToClipboard as defaultCopyToClipboard } from '../utils/clipboard.js';
import { openBrowser as defaultOpenBrowser } from '../utils/open-browser.js';
import * as ui from './ui.js';


export type ReviewUrlHandoffOptions = {
  readonly copy: boolean;
  readonly open: boolean;
  readonly apiBaseUrl: string;
  readonly reviewBaseUrl?: string | null;
  readonly copyToClipboard?: (reviewUrl: string) => Promise<boolean>;
  readonly openBrowser?: (reviewUrl: string) => Promise<boolean>;
};

export type ReviewUrlCopyOptions = {
  readonly json?: boolean;
  readonly noClipboard?: boolean;
  readonly clipboard?: boolean;
};

export function shouldCopyReviewUrl(options: ReviewUrlCopyOptions): boolean {
  if (options.noClipboard) return false;
  if (options.json) return options.clipboard === true;
  return true;
}

function emptyReviewUrlHandoff(): ReviewUrlHandoff {
  return {
    clipboard: { requested: false, ok: null },
    browser: { requested: false, ok: null }
  };
}

async function safeBooleanAction(action: () => Promise<boolean>): Promise<boolean> {
  try {
    return await action();
  } catch {
    return false;
  }
}

function rejectReviewUrlHandoff(handoff: ReviewUrlHandoff, options: { readonly copy: boolean; readonly open: boolean }): ReviewUrlHandoff {
  const warning = 'Review URL was rejected by trust policy. Run agentfeed share again to upload a fresh private review draft.';
  if (options.copy) {
    handoff.clipboard.requested = true;
    handoff.clipboard.ok = false;
    handoff.clipboard.warning = warning;
  }
  if (options.open) {
    handoff.browser.requested = true;
    handoff.browser.ok = false;
    handoff.browser.warning = warning;
  }
  return handoff;
}

export async function handoffReviewUrl(reviewUrl: string, options: ReviewUrlHandoffOptions): Promise<ReviewUrlHandoff> {
  const handoff = emptyReviewUrlHandoff();
  if ((options.copy || options.open) && !isTrustedReviewUrl(reviewUrl, options.apiBaseUrl, options.reviewBaseUrl)) {
    return rejectReviewUrlHandoff(handoff, options);
  }
  const copyToClipboard = options.copyToClipboard ?? defaultCopyToClipboard;
  const openBrowser = options.openBrowser ?? defaultOpenBrowser;
  const tasks: Promise<void>[] = [];
  if (options.copy) {
    handoff.clipboard.requested = true;
    tasks.push(safeBooleanAction(() => copyToClipboard(reviewUrl)).then((ok) => {
      handoff.clipboard.ok = ok;
      if (!ok) handoff.clipboard.warning = 'Review URL was not copied to clipboard. Copy the review URL manually.';
    }));
  }
  if (options.open) {
    handoff.browser.requested = true;
    tasks.push(safeBooleanAction(() => openBrowser(reviewUrl)).then((ok) => {
      handoff.browser.ok = ok;
      if (!ok) handoff.browser.warning = 'Review URL could not be opened automatically. Open the review URL manually.';
    }));
  }
  await Promise.all(tasks);
  return handoff;
}

function formatWarningLines(warning: string): string[] {
  return ui.wrapKeyValue('Warning', warning).map((line) => ui.warn(line));
}

export function reviewUrlHandoffLines(handoff: ReviewUrlHandoff, reviewUrl: string): string[] {
  const lines: string[] = [];
  let manualUrlNeeded = false;
  if (handoff.clipboard.requested) {
    if (handoff.clipboard.ok) lines.push('Review URL copied to clipboard.');
    else {
      lines.push(...formatWarningLines(handoff.clipboard.warning ?? 'Review URL was not copied to clipboard. Copy it manually.'));
      manualUrlNeeded = true;
    }
  }
  if (handoff.browser.requested) {
    if (handoff.browser.ok) lines.push('Review URL opened in browser.');
    else {
      lines.push(...formatWarningLines(handoff.browser.warning ?? 'Review URL could not be opened automatically. Open it manually.'));
      manualUrlNeeded = true;
    }
  }
  if (manualUrlNeeded) {
    lines.push('Manual review URL:');
    lines.push(`  ${ui.command(reviewUrl)}`);
  }
  return lines;
}
