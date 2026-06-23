import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { asRecord, asString, explicitCostUsd, integer, safeJsonParse } from './agent-session-core.js';

async function readJsonFile(path: string): Promise<Record<string, unknown> | null> {
  return asRecord(safeJsonParse(await readFile(path, 'utf8').catch(() => '')));
}

export async function readOmxMetadata(cwd: string, sessionId: string | null): Promise<{
  tokensUsed?: number;
  estimatedCostUsd?: number;
  subagentsSpawned?: number;
  subagentsCompleted?: number;
  agentTurns?: number;
  agentModes?: string[];
  detected?: boolean;
}> {
  const result: { tokensUsed?: number; estimatedCostUsd?: number; subagentsSpawned?: number; subagentsCompleted?: number; agentTurns?: number; agentModes?: string[]; detected?: boolean } = {};
  const metrics = await readJsonFile(join(cwd, '.omx', 'metrics.json'));
  result.tokensUsed = integer(metrics?.session_total_tokens) ?? undefined;
  result.estimatedCostUsd = explicitCostUsd(metrics) ?? undefined;
  if (metrics) result.detected = true;
  const tracking = await readJsonFile(join(cwd, '.omx', 'state', 'subagent-tracking.json'));
  const sessions = asRecord(tracking?.sessions);
  const exactSession = sessionId && sessions ? asRecord(sessions[sessionId]) : null;
  const fallbackSession = !sessionId && sessions ? asRecord(Object.values(sessions)[0]) : null;
  const session = exactSession ?? fallbackSession;
  const declaredSessionId = asString(session?.session_id);
  const threads = sessionId && declaredSessionId && declaredSessionId !== sessionId ? null : asRecord(session?.threads);
  if (threads) {
    result.detected = true;
    let spawned = 0;
    let turns = 0;
    const modes = new Set<string>();
    for (const threadRaw of Object.values(threads)) {
      const thread = asRecord(threadRaw);
      if (!thread) continue;
      if (thread.kind === 'subagent') spawned += 1;
      turns += integer(thread.turn_count) ?? 0;
      const mode = asString(thread.mode);
      if (mode) modes.add(mode);
    }
    result.subagentsSpawned = spawned || undefined;
    result.subagentsCompleted = spawned || undefined;
    result.agentTurns = turns || undefined;
    result.agentModes = [...modes];
  }
  return result;
}
