import type { LocalDraft } from '../types.js';

export function draftMarkdown(draft: LocalDraft): string {
  const tests = draft.worklog.metrics.tests_run == null ? 'Unknown' : `${draft.worklog.metrics.tests_run}`;
  return `# ${draft.worklog.title}\n\n${draft.worklog.summary}\n\n## Metrics\n\n- Agent: ${draft.worklog.agent}\n- Tokens: ${draft.worklog.metrics.tokens_used ?? 'Unknown'}\n- Files changed: ${draft.worklog.metrics.files_changed ?? 0}\n- Lines: +${draft.worklog.metrics.lines_added ?? 0} -${draft.worklog.metrics.lines_removed ?? 0}\n- Tests: ${tests}\n\n## Changed Areas\n\n${draft.worklog.changed_areas.map((a) => `- ${a}`).join('\n') || '- Application code'}\n\n## Outcome\n\n${draft.worklog.outcome.map((o) => `- ${o}`).join('\n')}\n\n## Privacy\n\nStatus: ${draft.privacy_scan.status}\n`;
}
