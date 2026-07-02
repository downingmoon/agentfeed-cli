import type { ChangedFileSummary } from '../types.js';
import type { FileEvidence } from './agent-session-shell-file-evidence.js';
import { parseGitNumstatOutput, parseGitStatusOutput } from './agent-session-shell-git-output.js';
import { parseShellWriteCommands } from './agent-session-shell-script-writes.js';

function changedFile(path: string, status: ChangedFileSummary['status'], added?: number | null, removed?: number | null): ChangedFileSummary {
  return {
    path,
    extension: null,
    language: null,
    status,
    publish_path: false,
    lines_added: added ?? null,
    lines_removed: removed ?? null
  };
}

function mergeEvidence(files: Map<string, ChangedFileSummary>, evidence: FileEvidence): void {
  const current = files.get(evidence.path);
  if (!current) {
    files.set(evidence.path, changedFile(evidence.path, evidence.status, evidence.added, evidence.removed));
    return;
  }
  files.set(evidence.path, {
    ...current,
    status: current.status === 'unknown' ? evidence.status : current.status,
    lines_added: current.lines_added ?? evidence.added ?? null,
    lines_removed: current.lines_removed ?? evidence.removed ?? null
  });
}

export function applyShellFileEvidence(
  projectRoot: string,
  input: {
    readonly command: string;
    readonly workdir?: string | null;
    readonly output?: string | null;
  },
  files: Map<string, ChangedFileSummary>
): void {
  const workdir = input.workdir ?? null;
  for (const evidence of parseShellWriteCommands(projectRoot, workdir, input.command)) mergeEvidence(files, evidence);
  const output = input.output ?? '';
  if (/\bgit\s+status\b/.test(input.command) && /(?:--short|-s)\b/.test(input.command)) {
    for (const evidence of parseGitStatusOutput(projectRoot, workdir, output)) mergeEvidence(files, evidence);
  }
  if (/\bgit\s+diff\b/.test(input.command) && /--numstat\b/.test(input.command)) {
    for (const evidence of parseGitNumstatOutput(projectRoot, workdir, output)) mergeEvidence(files, evidence);
  }
}

export const applyCodexShellFileEvidence = applyShellFileEvidence;
