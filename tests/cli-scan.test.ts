import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createEmptyDraft } from '../src/draft/create.js';
import { writeDraft } from '../src/draft/write.js';
import { scanSecret, useCliScanFixture } from './cli-scan-helpers.js';

const fixture = useCliScanFixture();

describe('scan CLI command draft output', () => {
  it('shows a safe redaction dry-run report without mutating the draft', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${scanSecret}`;
    await writeDraft(fixture.dir(), draft);

    const stdout = fixture.runScan([
      '--id',
      draft.id,
      '--dry-run'
    ]);

    const saved = JSON.parse(await readFile(fixture.draftPath(draft.id), 'utf8'));

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: dry run');
    expect(stdout).toContain('Privacy: danger');
    expect(stdout).toContain('Findings: 1');
    expect(stdout).toContain('Result: Sensitive public fields found; review redactions before sharing.');
    expect(stdout).toContain('Dry run: draft not modified.');
    expect(stdout).toContain('Findings detail');
    expect(stdout).toContain('Redacted preview');
    expect(stdout).toContain('[high] api_key_pattern at summary -> [REDACTED_SECRET]');
    expect(stdout).toContain('- summary: Deploy with [REDACTED_SECRET]');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
    expect(stdout).not.toContain(scanSecret);
    expect(saved.privacy_scan.status).toBe('safe');
  });

  it('redacts uploadable draft fields when scan is not a dry-run', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'claude_code' });
    draft.worklog.summary = `Deploy with ${scanSecret}`;
    await writeDraft(fixture.dir(), draft);

    const stdout = fixture.runScan([
      '--id',
      draft.id
    ]);

    const saved = JSON.parse(await readFile(fixture.draftPath(draft.id), 'utf8'));

    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: redact and save');
    expect(stdout).toContain('Privacy: danger');
    expect(stdout).toContain('Saved: redacted public fields were written to the local draft.');
    expect(stdout).toContain('- summary: Deploy with [REDACTED_SECRET]');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed preview --id ${draft.id}`);
    expect(stdout).toContain(`agentfeed publish --id ${draft.id} --yes`);
    expect(stdout).not.toContain(scanSecret);
    expect(saved.privacy_scan.status).toBe('danger');
    expect(saved.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
  });

  it('prints a reassuring safe report when no redaction is needed', async () => {
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: fixture.dir(), source: 'codex' });
    draft.worklog.summary = 'Refined CLI output and kept public fields clean.';
    await writeDraft(fixture.dir(), draft);

    const stdout = fixture.runScan([
      '--id',
      draft.id,
      '--dry-run'
    ]);

    expect(stdout).toContain('AgentFeed privacy scan');
    expect(stdout).toContain(`Target: draft ${draft.id}`);
    expect(stdout).toContain('Mode: dry run');
    expect(stdout).toContain('Privacy: safe');
    expect(stdout).toContain('Findings: 0');
    expect(stdout).toContain('Result: No public-field findings detected.');
    expect(stdout).toContain('Findings detail');
    expect(stdout).toContain('No findings detected.');
    expect(stdout).toContain('Redacted preview');
    expect(stdout).toContain('No redactions needed.');
    expect(stdout).toContain('Next');
    expect(stdout).toContain(`agentfeed scan --id ${draft.id}`);
  });
});
