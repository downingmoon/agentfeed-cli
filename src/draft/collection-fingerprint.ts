import type { AgentFeedProjectConfig, AgentType, ChangedFileSummary, CollectionWindow, LocalDraft } from '../types.js';
import { shouldIgnoreEvidencePath } from '../collectors/path-filter.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { shortHash } from '../utils/hash.js';
import { listDrafts, readDraft } from './read.js';

type FingerprintChangedFile = Pick<ChangedFileSummary, 'path' | 'status' | 'lines_added' | 'lines_removed'>;

type CollectionFingerprintInput = {
  readonly source: AgentType;
  readonly sessionId?: string | null;
  readonly sessionIdentity?: string | null;
  readonly headCommit?: string | null;
  readonly window?: CollectionWindow | null;
  readonly changedFiles?: readonly ChangedFileSummary[];
  readonly userNote?: string | null;
  readonly configuredCommandIntent?: boolean;
  readonly collectionPolicy?: Record<string, unknown>;
};

type DraftLookupResult = {
  readonly draft: LocalDraft | null;
  readonly warnings: readonly string[];
};

export function compactDraftReadFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 360);
}

export async function findDraftByFingerprint(cwd: string, fingerprint: string): Promise<DraftLookupResult> {
  const warnings: string[] = [];
  for (const row of await listDrafts(cwd)) {
    let draft: LocalDraft;
    try {
      draft = await readDraft(cwd, row.id);
    } catch (error) {
      warnings.push([
        `Existing AgentFeed draft could not be read and was skipped during duplicate detection: ${row.id}.`,
        compactDraftReadFailure(error),
        'Inspect saved drafts with: agentfeed drafts',
        'Remove the malformed draft or create a fresh draft with: agentfeed collect --explain'
      ].filter(Boolean).join(' '));
      continue;
    }
    if (draft.source.collection_fingerprint === fingerprint) return { draft, warnings };
  }
  return { draft: null, warnings };
}

function normalizedChangedFilesForFingerprint(files: readonly ChangedFileSummary[]): FingerprintChangedFile[] {
  return files
    .filter((file) => file.path && !shouldIgnoreEvidencePath(file.path))
    .map((file) => ({
      path: file.path,
      status: file.status,
      lines_added: file.lines_added ?? null,
      lines_removed: file.lines_removed ?? null
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function redactedUserNoteForFingerprint(note?: string | null): string | null {
  const trimmed = note?.trim();
  const normalized = trimmed ? trimmed.slice(0, 500) : null;
  if (!normalized) return null;
  const { redacted } = scanAndRedactFields({ user_note: normalized });
  const value = redacted.user_note;
  return typeof value === 'string' && value ? value : null;
}

export function collectionPolicyForFingerprint(config: AgentFeedProjectConfig): Record<string, unknown> {
  return {
    project: {
      name: config.project.name,
      repository_url: config.project.repository_url ?? null,
      visibility: config.project.visibility,
      tags: config.project.tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 10)
        .sort((a, b) => a.localeCompare(b))
    },
    collection: {
      include_file_stats: config.collection.include_file_stats,
      include_public_prompt: config.collection.include_public_prompt,
      include_token_usage: config.collection.include_token_usage,
      include_estimated_cost: config.collection.include_estimated_cost,
      include_test_results: config.collection.include_test_results,
      run_tests_on_collect: config.collection.run_tests_on_collect
    }
  };
}

export function collectionFingerprint(input: CollectionFingerprintInput): string | null {
  if (!input.headCommit) return null;
  const changedFiles = normalizedChangedFilesForFingerprint(input.changedFiles ?? []);
  const uploadAffectingInputs = {
    user_note: input.userNote ?? null,
    configured_command_intent: input.configuredCommandIntent === true,
    collection_policy: input.collectionPolicy ?? null
  };
  const sessionIdentity = input.sessionIdentity ?? input.sessionId ?? null;
  if (sessionIdentity) {
    return shortHash(JSON.stringify({ source: input.source, session_identity: sessionIdentity, head_commit: input.headCommit, window: input.window ?? null, changed_files: changedFiles, upload_affecting_inputs: uploadAffectingInputs }), 16);
  }
  if (!changedFiles.length) return null;
  return shortHash(JSON.stringify({ source: input.source, head_commit: input.headCommit, window: input.window ?? null, changed_files: changedFiles, upload_affecting_inputs: uploadAffectingInputs }), 16);
}
