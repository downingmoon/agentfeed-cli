import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { formatPrivacyPolicyLines, formatSharePreview, privacyPolicySummary } from '../src/cli/share.js';

describe('share privacy policy messaging', () => {
  it('explains that high/critical-severity findings block public publishing but not private review upload', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.privacy_scan = {
      status: 'danger',
      findings: [{
        id: 'finding-1',
        type: 'api_key_pattern',
        severity: 'high',
        message: 'Possible secret',
        field: 'worklog.summary',
        sample_redacted: '[REDACTED_SECRET]',
        resolved: false,
      }],
    };

    const output = formatSharePreview(draft);

    expect(output).toContain('Privacy: danger · findings 1');
    expect(output).toContain('Privacy review: required before public publishing.');
    expect(output).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');
    expect(output).toContain('Private review upload is allowed so you can resolve findings in the web review.');
    expect(formatPrivacyPolicyLines(draft)).toHaveLength(3);
    expect(privacyPolicySummary(draft)).toEqual({
      private_review_upload: 'allowed',
      public_publish_blocked: true,
      review_required: true,
    });
  });

  it('treats unresolved critical privacy findings as public publish blockers even when status is warning', () => {
    const draft = createEmptyDraft({ projectName: 'agentfeed-cli', projectRoot: '/tmp/agentfeed-cli', source: 'codex' });
    draft.privacy_scan = {
      status: 'warning',
      findings: [{
        id: 'finding-critical',
        type: 'possible_secret',
        severity: 'critical',
        message: 'Critical secret signal',
        field: 'worklog.summary',
        resolved: false,
      }],
    };

    expect(privacyPolicySummary(draft)).toEqual({
      private_review_upload: 'allowed',
      public_publish_blocked: true,
      review_required: true,
    });
    expect(formatSharePreview(draft)).toContain('Public/unlisted publishing is blocked in AgentFeed until high/critical-severity findings are resolved.');

    draft.privacy_scan.findings[0].resolved = true;
    expect(privacyPolicySummary(draft).public_publish_blocked).toBe(false);
  });
});
