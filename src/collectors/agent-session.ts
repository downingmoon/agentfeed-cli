import { basename, resolve } from 'node:path';
import type { AgentType } from '../types.js';
import { parseClaudeSessionFile } from './agent-session-claude.js';
import { parseCodexSessionFile } from './agent-session-codex.js';
import { parseGenericMetadata } from './agent-session-generic.js';
import { parseGeminiSessionFile } from './agent-session-gemini.js';
import { discoverSessionFile, sessionFileMayBelongToProject } from './agent-session-files.js';
import type { AgentSessionMetrics } from './agent-session-finalize.js';

export type { AgentSessionMetrics } from './agent-session-finalize.js';
export { sessionFileBelongsToProject } from './agent-session-files.js';

export interface CollectAgentSessionOptions {
  readonly cwd: string;
  readonly source: AgentType;
  readonly sessionFile?: string | null;
  readonly since?: string | null;
  readonly until?: string | null;
  readonly inferIdleGap?: boolean;
}

export async function collectAgentSessionMetrics(options: CollectAgentSessionOptions): Promise<AgentSessionMetrics | null> {
  const sessionFile = options.sessionFile ? resolve(options.cwd, options.sessionFile) : await discoverSessionFile(options.cwd, options.source);
  if (sessionFile && !(await sessionFileMayBelongToProject(sessionFile, options.cwd))) return null;
  if (options.source === 'other') return parseGenericMetadata(options.cwd, sessionFile, { since: options.since, until: options.until });
  if (options.source === 'cursor') return parseGenericMetadata(options.cwd, sessionFile, { since: options.since, until: options.until }, { sourceName: 'cursor', roots: ['.cursor'] });
  if (!sessionFile || basename(sessionFile).startsWith('.')) return null;
  if (options.source === 'claude_code') return parseClaudeSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  if (options.source === 'codex') return parseCodexSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  if (options.source === 'gemini_cli') return parseGeminiSessionFile(options.cwd, sessionFile, { since: options.since, until: options.until }, options.inferIdleGap ?? true);
  return null;
}
