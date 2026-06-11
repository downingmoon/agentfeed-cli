export type DoctorReadinessItem = {
  readonly name: string;
  readonly status: 'ready' | 'attention';
  readonly detail: string;
  readonly next_action?: string;
};

export type DoctorApiReachability = {
  readonly ok?: boolean;
  readonly status?: number;
  readonly error?: string;
};

export type DoctorApiCompatibility = {
  readonly compatible?: boolean;
  readonly status?: number;
  readonly error?: string;
};

export type DoctorReadinessOptions = {
  readonly invalidApiBaseUrl: boolean;
  readonly projectConfigValid: boolean;
  readonly projectConfigError: string | null;
  readonly missingToken: boolean;
  readonly insideGitRepository: boolean;
  readonly tokenWarnings: readonly string[];
  readonly apiReachability: DoctorApiReachability | null;
  readonly apiCompatibility: DoctorApiCompatibility | null;
  readonly agentSignalLines: readonly string[];
};

export type DoctorSummary = {
  readonly status: 'ready' | 'attention_needed';
  readonly ready: number;
  readonly attention: number;
};

export type DoctorPriorityAction = {
  readonly name: string;
  readonly detail: string;
  readonly command: string;
};

export type DoctorNextActionOptions = {
  readonly invalidApiBaseUrl: boolean;
  readonly projectConfigValid: boolean;
  readonly projectConfigError: string | null;
  readonly missingToken: boolean;
  readonly insideGitRepository: boolean;
  readonly tokenWarnings: readonly string[];
  readonly apiNeedsRecheck: boolean;
};

type DoctorReadinessActionItem = DoctorReadinessItem & {
  readonly next_action: string;
};

function uniqueDoctorCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

function detectedAgentSignalCount(lines: readonly string[]): number {
  return lines.filter((line) => /^.+: detected$/.test(line.trim())).length;
}

function doctorApiDetail(options: Pick<DoctorReadinessOptions, 'invalidApiBaseUrl' | 'apiReachability' | 'apiCompatibility'>): string {
  if (options.invalidApiBaseUrl) return 'invalid API base URL';
  if (!options.apiReachability?.ok) {
    return `API not reachable (${options.apiReachability?.status ?? options.apiReachability?.error ?? 'unreachable'})`;
  }
  if (!options.apiCompatibility?.compatible) {
    return `API contract mismatch (${options.apiCompatibility?.status ?? options.apiCompatibility?.error ?? 'unknown'})`;
  }
  return 'reachable and compatible';
}

function hasDoctorNextAction(item: DoctorReadinessItem): item is DoctorReadinessActionItem {
  return item.status === 'attention' && typeof item.next_action === 'string' && item.next_action.length > 0;
}

export function doctorReadinessItems(options: DoctorReadinessOptions): DoctorReadinessItem[] {
  const apiReady = !options.invalidApiBaseUrl && Boolean(options.apiReachability?.ok && options.apiCompatibility?.compatible);
  const agentSignalCount = detectedAgentSignalCount(options.agentSignalLines);
  const projectInitAction = options.insideGitRepository ? 'agentfeed init' : 'git init && agentfeed init';
  const projectItem: DoctorReadinessItem = options.projectConfigValid
    ? { name: 'Project', status: 'ready', detail: 'initialized' }
    : options.projectConfigError
      ? { name: 'Project', status: 'attention', detail: 'config unreadable', next_action: 'agentfeed init --force' }
      : { name: 'Project', status: 'attention', detail: 'not initialized', next_action: projectInitAction };
  const collectionItem: DoctorReadinessItem = options.projectConfigValid
    ? { name: 'Collection', status: 'ready', detail: 'cursor available' }
    : options.projectConfigError
      ? { name: 'Collection', status: 'attention', detail: 'unavailable because project config is unreadable', next_action: 'agentfeed init --force' }
      : { name: 'Collection', status: 'attention', detail: 'unavailable until project is initialized', next_action: projectInitAction };
  return [
    options.missingToken
      ? { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }
      : options.tokenWarnings.length
        ? { name: 'Account', status: 'attention', detail: options.tokenWarnings[0] ?? 'token requires attention', next_action: 'agentfeed rotate' }
        : { name: 'Account', status: 'ready', detail: 'token configured' },
    apiReady
      ? { name: 'API', status: 'ready', detail: doctorApiDetail(options) }
      : {
        name: 'API',
        status: 'attention',
        detail: doctorApiDetail(options),
        next_action: options.invalidApiBaseUrl ? 'unset AGENTFEED_API_BASE_URL' : 'agentfeed doctor'
      },
    projectItem,
    options.insideGitRepository
      ? { name: 'Git', status: 'ready', detail: 'repository detected' }
      : { name: 'Git', status: 'attention', detail: 'repository not detected', next_action: 'git init' },
    collectionItem,
    agentSignalCount > 0
      ? {
        name: 'Agent signals',
        status: 'ready',
        detail: `${agentSignalCount} source${agentSignalCount === 1 ? '' : 's'} detected`
      }
      : {
        name: 'Agent signals',
        status: 'attention',
        detail: 'no supported agent signals detected',
        next_action: 'agentfeed collect --explain'
      }
  ];
}

export function doctorSummary(readiness: readonly DoctorReadinessItem[]): DoctorSummary {
  const attention = readiness.filter((item) => item.status === 'attention').length;
  return {
    status: attention > 0 ? 'attention_needed' : 'ready',
    ready: readiness.length - attention,
    attention
  };
}

export function doctorPriorityActions(readiness: readonly DoctorReadinessItem[]): DoctorPriorityAction[] {
  const priorityOrder = ['API', 'Project', 'Git', 'Account', 'Collection', 'Agent signals'];
  return readiness
    .filter(hasDoctorNextAction)
    .sort((a, b) => priorityOrder.indexOf(a.name) - priorityOrder.indexOf(b.name))
    .map((item) => ({ name: item.name, detail: item.detail, command: item.next_action }));
}

export function doctorNextActions(options: DoctorNextActionOptions): string[] {
  if (options.invalidApiBaseUrl) {
    return uniqueDoctorCommands([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed doctor'
    ]);
  }
  if (options.projectConfigError) {
    return uniqueDoctorCommands([
      'agentfeed init --force',
      'agentfeed doctor',
      ...(options.missingToken ? ['agentfeed login'] : [])
    ]);
  }
  return uniqueDoctorCommands([
    ...(!options.projectConfigValid
      ? (options.insideGitRepository ? ['agentfeed init'] : ['git init && agentfeed init', 'agentfeed init --no-git-check'])
      : []),
    ...(options.missingToken ? ['agentfeed login'] : []),
    ...(options.projectConfigValid && options.missingToken ? ['agentfeed share --dry'] : []),
    ...(options.tokenWarnings.length ? ['agentfeed rotate'] : []),
    ...(options.apiNeedsRecheck ? ['agentfeed doctor'] : []),
    ...(options.projectConfigValid && !options.missingToken && !options.tokenWarnings.length && !options.apiNeedsRecheck ? ['agentfeed share --dry'] : [])
  ]);
}
