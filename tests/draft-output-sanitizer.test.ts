import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sanitizeDraftForCliOutput } from '../src/cli/draft-output-sanitizer.js';
import { initProject } from '../src/config/project-config.js';
import { createEmptyDraft } from '../src/draft/create.js';

const secret = 'sk-abcdefghijklmnopqrstuvwxyz1234567890';

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-draft-output-sanitizer-'));
  await initProject({ cwd: dir, noGitCheck: true });
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('draft output sanitizer', () => {
  it('redacts public draft fields and writes the sanitized draft for CLI output', async () => {
    // Given: a local draft contains a secret-like value in public output fields.
    const draft = createEmptyDraft({ projectName: 'proj', projectRoot: dir, source: 'codex' });
    draft.id = 'draft_output_sanitizer';
    draft.worklog.summary = `Deploy with ${secret}`;

    // When: the CLI output sanitizer prepares the draft for display/upload output.
    const result = await sanitizeDraftForCliOutput(dir, draft);

    // Then: the in-memory and persisted draft both contain only redacted public fields.
    expect(result).toBe(draft);
    expect(result.worklog.summary).toBe('Deploy with [REDACTED_SECRET]');
    expect(result.privacy_scan.status).toBe('danger');
    const saved = await readFile(join(dir, '.agentfeed', 'drafts', `${draft.id}.json`), 'utf8');
    expect(saved).toContain('Deploy with [REDACTED_SECRET]');
    expect(saved).not.toContain(secret);
  });
});
