import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { asRecord, asString, safeJsonParse } from './agent-session-core.js';

export type SessionFileCandidate = {
  readonly path: string;
  readonly allowProjectScopedNoCwd?: boolean;
  readonly trustedProjectMatch?: boolean;
};

function canonicalPath(path: string): string {
  const absolute = resolve(path);
  const suffix: string[] = [];
  let current = absolute;
  while (true) {
    try {
      const real = realpathSync.native(current);
      return suffix.length ? join(real, ...suffix.reverse()) : real;
    } catch {
      const parent = dirname(current);
      if (parent === current) return absolute;
      suffix.push(basename(current));
      current = parent;
    }
  }
}

function pathBelongsToProject(cwd: string, workspace: string): boolean {
  const projectRoot = canonicalPath(cwd);
  const absoluteWorkspace = canonicalPath(workspace);
  return absoluteWorkspace === projectRoot || absoluteWorkspace.startsWith(`${projectRoot}/`);
}

function antigravityTranscriptCandidates(home: string, conversationId: string): readonly string[] {
  const logsDir = join(home, '.gemini', 'antigravity-cli', 'brain', conversationId, '.system_generated', 'logs');
  return [
    join(logsDir, 'transcript_full.jsonl'),
    join(logsDir, 'transcript.jsonl')
  ];
}

export async function antigravityHistoryTranscriptCandidates(home: string, cwd: string): Promise<SessionFileCandidate[]> {
  const historyFile = join(home, '.gemini', 'antigravity-cli', 'history.jsonl');
  const text = await readFile(historyFile, 'utf8').catch(() => '');
  const candidates: SessionFileCandidate[] = [];
  const seen = new Set<string>();
  for (const line of text.split('\n').reverse()) {
    if (!line.trim()) continue;
    const row = asRecord(safeJsonParse(line));
    const conversationId = asString(row?.conversationId);
    const workspace = asString(row?.workspace);
    if (!conversationId || !workspace || !pathBelongsToProject(cwd, workspace)) continue;
    for (const transcript of antigravityTranscriptCandidates(home, conversationId)) {
      if (seen.has(transcript)) continue;
      seen.add(transcript);
      candidates.push({ path: transcript, trustedProjectMatch: true });
    }
  }
  return candidates;
}
