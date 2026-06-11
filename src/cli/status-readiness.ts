export type StatusReadinessItem = {
  readonly name: string;
  readonly status: 'ready' | 'attention';
  readonly detail: string;
  readonly next_action?: string;
};

export type StatusReadinessOptions = {
  readonly invalidApiBaseUrl: boolean;
  readonly projectInitialized: boolean;
  readonly projectConfigError: string | null;
  readonly hasToken: boolean;
  readonly insideGitRepository: boolean;
  readonly pendingUploads: number;
};

export type StatusReadinessSummary = {
  readonly status: 'ready' | 'attention_needed';
  readonly ready: number;
  readonly attention: number;
  readonly total: number;
};

function uniqueStatusCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function statusReadinessItems(options: StatusReadinessOptions): StatusReadinessItem[] {
  const projectInitAction = options.insideGitRepository ? 'agentfeed init' : 'git init && agentfeed init';
  const projectItem: StatusReadinessItem = options.projectInitialized
    ? { name: 'Project', status: 'ready', detail: 'initialized' }
    : options.projectConfigError
      ? { name: 'Project', status: 'attention', detail: 'config unreadable', next_action: 'agentfeed init --force' }
      : { name: 'Project', status: 'attention', detail: 'not initialized', next_action: projectInitAction };
  return [
    options.invalidApiBaseUrl
      ? { name: 'API', status: 'attention', detail: 'invalid API base URL', next_action: 'agentfeed doctor' }
      : { name: 'API', status: 'ready', detail: 'base URL accepted' },
    projectItem,
    options.insideGitRepository
      ? { name: 'Git', status: 'ready', detail: 'repository detected' }
      : { name: 'Git', status: 'attention', detail: 'repository not detected', next_action: 'git init' },
    options.hasToken
      ? { name: 'Account', status: 'ready', detail: 'token configured' }
      : { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' },
    options.pendingUploads > 0
      ? {
        name: 'Uploads',
        status: 'attention',
        detail: `${options.pendingUploads} pending draft${options.pendingUploads === 1 ? '' : 's'}`,
        next_action: 'agentfeed publish --latest --yes'
      }
      : { name: 'Uploads', status: 'ready', detail: 'no pending uploads' }
  ];
}

export function statusSummary(readiness: readonly StatusReadinessItem[]): StatusReadinessSummary {
  const attention = readiness.filter((item) => item.status === 'attention').length;
  return {
    status: attention === 0 ? 'ready' : 'attention_needed',
    ready: readiness.length - attention,
    attention,
    total: readiness.length
  };
}

export function setupProgressText(readiness: readonly StatusReadinessItem[]): string {
  const summary = statusSummary(readiness);
  const attentionLabel = summary.attention === 1 ? '1 needs attention' : `${summary.attention} need attention`;
  return `${summary.ready}/${summary.total} ready · ${attentionLabel}`;
}

export function statusNextActions(options: StatusReadinessOptions): string[] {
  if (options.invalidApiBaseUrl) {
    return uniqueStatusCommands([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed status',
      'agentfeed doctor'
    ]);
  }
  if (options.projectConfigError) {
    return uniqueStatusCommands([
      'agentfeed init --force',
      'agentfeed doctor',
      ...(!options.hasToken ? ['agentfeed login'] : [])
    ]);
  }
  if (!options.projectInitialized) {
    return uniqueStatusCommands([
      ...(options.insideGitRepository ? ['agentfeed init'] : ['git init && agentfeed init', 'agentfeed init --no-git-check']),
      ...(!options.hasToken ? ['agentfeed login'] : [])
    ]);
  }
  if (!options.hasToken) {
    return uniqueStatusCommands([
      'agentfeed login',
      ...(options.pendingUploads > 0
        ? ['agentfeed publish --latest --yes', 'agentfeed discard --latest']
        : ['agentfeed share --dry'])
    ]);
  }
  if (options.pendingUploads > 0) {
    return uniqueStatusCommands([
      'agentfeed publish --latest --yes',
      'agentfeed discard --latest'
    ]);
  }
  return ['agentfeed share --yes'];
}
