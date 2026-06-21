export type UploadPreflightOptions = {
  readonly retryCommand?: string;
  readonly credentialContext?: UploadCredentialContext;
};

export type UploadCredentialContext = {
  readonly tokenSourceLabel: string;
  readonly credentialStoreLabel: string;
  readonly apiBaseUrl: string;
  readonly apiBaseSourceLabel?: string;
  readonly credentialsFilePath?: string;
};

export type UploadApiCheckResult = {
  readonly url: string;
  readonly status?: number;
  readonly error?: string;
};

function uniqueUploadCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function uploadNextActions(draftId: string): string[] {
  return uniqueUploadCommands([
    `agentfeed open --id ${draftId}`,
    `agentfeed preview --id ${draftId}`
  ]);
}

export function apiCheckFailureDetail(result: UploadApiCheckResult): string {
  if (result.status != null) {
    return result.error ? `HTTP ${result.status}: ${result.error}` : `HTTP ${result.status}`;
  }
  return result.error ?? 'unknown token check failure';
}

export function apiCompatibilityFailureDetail(result: UploadApiCheckResult): string {
  if (result.status != null) {
    return result.error ? `HTTP ${result.status}: ${result.error}` : `HTTP ${result.status}`;
  }
  return result.error ?? 'unknown compatibility failure';
}

type UploadRecoveryMessageInput = {
  readonly firstLine: string;
  readonly fixCommands: readonly string[];
  readonly retryCommand?: string;
  readonly credentialContext?: UploadCredentialContext;
};

function credentialContextLines(context: UploadCredentialContext): string[] {
  return [
    '',
    'Credential context:',
    `- User/token source: ${context.tokenSourceLabel}`,
    `- Credential store: ${context.credentialStoreLabel}`,
    `- API base URL: ${context.apiBaseUrl}`,
    ...(context.apiBaseSourceLabel ? [`- API base URL source: ${context.apiBaseSourceLabel}`] : []),
    ...(context.credentialsFilePath ? [`- Credentials file: ${context.credentialsFilePath}`] : []),
    '- AGENTFEED_TOKEN is not exported by browser login; an empty echo "$AGENTFEED_TOKEN" can be normal when using saved credentials.'
  ];
}

export function formatUploadRecoveryMessage(input: UploadRecoveryMessageInput): string {
  const lines = [
    input.firstLine,
    '',
    'Fix first:',
    ...uniqueUploadCommands(input.fixCommands).map((command) => `Run: ${command}`)
  ];
  if (input.credentialContext) {
    lines.push(...credentialContextLines(input.credentialContext));
  }
  if (input.retryCommand) {
    lines.push('', 'Then retry:', `Run: ${input.retryCommand}`);
  }
  return lines.join('\n');
}

export function apiCompatibilityRecoveryCommands(result: UploadApiCheckResult): string[] {
  const commands = ['agentfeed doctor', 'agentfeed status'];
  if (result.status == null) commands.push('agentfeed doctor --json');
  return commands;
}

export function ingestionTokenRecoveryCommands(result: UploadApiCheckResult): string[] {
  if (result.status === 401 || result.status === 403) {
    if (process.env.AGENTFEED_TOKEN) {
      return ['unset AGENTFEED_TOKEN', 'agentfeed status', 'agentfeed login', 'agentfeed rotate'];
    }
    return process.env.AGENTFEED_API_BASE_URL
      ? ['agentfeed status', 'agentfeed login', 'agentfeed rotate']
      : ['agentfeed login', 'agentfeed rotate', 'agentfeed status'];
  }
  if (result.status == null || (result.status >= 500 && result.status <= 599)) {
    return ['agentfeed doctor', 'agentfeed status'];
  }
  return ['agentfeed login', 'agentfeed rotate', 'agentfeed doctor', 'agentfeed status'];
}
