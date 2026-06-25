import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { asRecord, explicitCostUsd, integer, safeJsonParse } from './agent-session-core.js';

export interface OmcMetadata {
  readonly toolCalls?: number;
  readonly estimatedCostUsd?: number;
  readonly subagentsSpawned?: number;
  readonly subagentsCompleted?: number;
  readonly agentModes?: readonly string[];
  readonly detected?: boolean;
}

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  return asRecord(safeJsonParse(await readFile(path, 'utf8').catch(() => '')));
}

export async function readOmcMetadata(cwd: string, sessionId: string | null): Promise<OmcMetadata> {
  if (!sessionId) return {};
  const result: {
    toolCalls?: number;
    estimatedCostUsd?: number;
    subagentsSpawned?: number;
    subagentsCompleted?: number;
    agentModes?: string[];
    detected?: boolean;
  } = {};
  const session = await readJsonFile(join(cwd, '.omc', 'sessions', `${sessionId}.json`));
  if (session) {
    result.detected = true;
    result.estimatedCostUsd = explicitCostUsd(session) ?? undefined;
    result.subagentsSpawned = integer(session.agents_spawned) ?? undefined;
    result.subagentsCompleted = integer(session.agents_completed) ?? undefined;
    result.agentModes = Array.isArray(session.modes_used) ? session.modes_used.filter((mode): mode is string => typeof mode === 'string') : undefined;
  }
  const stats = await readJsonFile(join(homedir(), '.claude', '.session-stats.json'));
  const statsSession = asRecord(asRecord(stats?.sessions)?.[sessionId]);
  result.estimatedCostUsd = Math.max(result.estimatedCostUsd ?? 0, explicitCostUsd(statsSession) ?? 0) || result.estimatedCostUsd;
  const totalCalls = integer(statsSession?.total_calls);
  if (totalCalls) {
    result.toolCalls = totalCalls;
    result.detected = true;
  }
  return result;
}
