export type UploadPreflightOptions = {
  readonly retryCommand?: string;
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

export function formatUploadRecoveryMessage(firstLine: string, fixCommands: readonly string[], retryCommand?: string): string {
  const lines = [
    firstLine,
    '',
    'Fix first:',
    ...uniqueUploadCommands(fixCommands).map((command) => `Run: ${command}`)
  ];
  if (retryCommand) {
    lines.push('', 'Then retry:', `Run: ${retryCommand}`);
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
    return ['agentfeed login', 'agentfeed rotate', 'agentfeed status'];
  }
  if (result.status == null || (result.status >= 500 && result.status <= 599)) {
    return ['agentfeed doctor', 'agentfeed status'];
  }
  return ['agentfeed login', 'agentfeed rotate', 'agentfeed doctor', 'agentfeed status'];
}
