import type { ReviewUrlHandoff } from '../types.js';
import * as ui from './ui.js';

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
