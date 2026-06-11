export type PrivacyScanNextActionOptions = {
  readonly dryRun?: boolean;
  readonly draftId?: string;
  readonly path?: string;
};

export type HookLifecycleAction = 'install' | 'uninstall';

export function privacyScanNextActions(options: PrivacyScanNextActionOptions = {}): string[] {
  if (options.draftId) {
    return options.dryRun
      ? [`agentfeed scan --id ${options.draftId}`]
      : [`agentfeed preview --id ${options.draftId}`, `agentfeed publish --id ${options.draftId} --yes`];
  }
  if (options.path) return ['agentfeed collect --explain'];
  return ['agentfeed status'];
}

export function hookNextActions(action: HookLifecycleAction, dryRun = false): string[] {
  if (action === 'install' && dryRun) return ['agentfeed hook install claude-code'];
  if (action === 'install') return ['agentfeed status', 'agentfeed share --dry'];
  return ['agentfeed status'];
}

export function initNextActions(alreadyInitialized: boolean): string[] {
  return alreadyInitialized
    ? ['agentfeed status', 'agentfeed share --dry', 'agentfeed init --force']
    : ['agentfeed login', 'agentfeed hook install claude-code', 'agentfeed share --dry'];
}

export function commandCatalogNextActions(): string[] {
  return ['agentfeed init', 'agentfeed login', 'agentfeed share --dry'];
}
