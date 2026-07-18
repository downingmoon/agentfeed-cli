import { isAbsolute, relative, resolve } from 'node:path';
import type { AgentFeedProjectConfig, AgentType } from '../types.js';
import { detectAgentSignals } from '../collectors/agent-discovery.js';
import { compactDraftReadFailure } from './collection-fingerprint.js';

export type AutoAgentSources = {
  readonly enabled: readonly AgentType[];
  readonly attributable: readonly AgentType[];
  readonly globalOnly: readonly AgentType[];
  readonly warnings: readonly string[];
};

export async function autoAgentSources(cwd: string, config: AgentFeedProjectConfig): Promise<AutoAgentSources> {
  const configuredSources: AgentType[] = [];
  if (config.agents.claude_code.enabled) configuredSources.push('claude_code');
  if (config.agents.codex.enabled) configuredSources.push('codex');
  if (config.agents.cursor.enabled) configuredSources.push('cursor');
  if (config.agents.gemini_cli.enabled) configuredSources.push('gemini_cli');
  let signals: Awaited<ReturnType<typeof detectAgentSignals>>;
  try {
    signals = await detectAgentSignals({ cwd });
  } catch (error) {
    return {
      enabled: configuredSources,
      attributable: [],
      globalOnly: [],
      warnings: [
        [
          'Agent signal auto-detection failed; collection fell back to enabled project agents only.',
          compactDraftReadFailure(error),
          'Run: agentfeed doctor',
          'Retry with an explicit source if needed: agentfeed collect --source <source> --explain'
        ].filter(Boolean).join(' ')
      ]
    };
  }
  const hasProjectLocalSignal = (paths: readonly string[]): boolean => {
    if (!paths.length) return false;
    const root = resolve(cwd);
    return paths.some((path) => {
      const rel = relative(root, resolve(path));
      return rel && !rel.startsWith('..') && !isAbsolute(rel);
    });
  };
  const signalScore = (paths: readonly string[]): number => {
    if (!paths.length) return 0;
    return hasProjectLocalSignal(paths) ? 2 : 1;
  };
  const scores: Record<AgentType, number> = {
    claude_code: Math.max(signalScore(signals.claude_code.paths), signalScore(signals.omc.paths)),
    codex: Math.max(signalScore(signals.codex.paths), signalScore(signals.omx.paths)),
    cursor: signalScore(signals.cursor.paths),
    gemini_cli: Math.max(signalScore(signals.gemini_cli.paths), signalScore(signals.superpowers.paths)),
    other: 0
  };
  const localScores: Record<AgentType, number> = {
    claude_code: hasProjectLocalSignal([...signals.claude_code.paths, ...signals.omc.paths]) ? 2 : 0,
    codex: hasProjectLocalSignal([...signals.codex.paths, ...signals.omx.paths]) ? 2 : 0,
    cursor: hasProjectLocalSignal(signals.cursor.paths) ? 2 : 0,
    gemini_cli: hasProjectLocalSignal([...signals.gemini_cli.paths, ...signals.superpowers.paths]) ? 2 : 0,
    other: 0
  };
  const knownSources: readonly AgentType[] = ['claude_code', 'codex', 'cursor', 'gemini_cli'];
  const enabledSet = new Set<AgentType>(configuredSources);
  for (const source of knownSources) {
    if (localScores[source] > 0 || (source === 'codex' && scores[source] > 0)) enabledSet.add(source);
  }
  const enabled = [...enabledSet].sort((a, b) => scores[b] - scores[a]);
  return {
    enabled,
    attributable: enabled.filter((source) => localScores[source] > 0),
    globalOnly: knownSources.filter((source) => scores[source] > 0 && localScores[source] === 0),
    warnings: []
  };
}

export function explicitSessionProbeSources(enabledSources: readonly AgentType[], sessionFile: string | null): AgentType[] {
  if (!sessionFile) return [...enabledSources];
  const sources = new Set<AgentType>(enabledSources);
  for (const source of ['claude_code', 'codex', 'gemini_cli'] as const) sources.add(source);
  if (sessionFile.split(/[\\/]/).includes('.cursor')) sources.add('cursor');
  return [...sources];
}
