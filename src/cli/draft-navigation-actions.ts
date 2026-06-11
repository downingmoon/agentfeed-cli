export type DraftListActionRow = {
  readonly id: string;
  readonly valid: boolean;
  readonly status?: 'pending' | 'uploaded';
};

function uniqueNextCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function shareDryRunNextActions(draftId: string, hasCredentials: boolean): string[] {
  return uniqueNextCommands([
    `agentfeed preview --id ${draftId}`,
    ...(!hasCredentials ? ['agentfeed login'] : []),
    `agentfeed publish --id ${draftId} --yes`
  ]);
}

export function discardConfirmationNextActions(id: string): string[] {
  return [`agentfeed discard --id ${id} --yes`, `agentfeed preview --id ${id}`];
}

export function discardCompleteNextActions(): string[] {
  return ['agentfeed drafts', 'agentfeed collect --explain'];
}

export function draftListNextActions(rows: readonly DraftListActionRow[]): string[] {
  if (!rows.length) {
    return ['agentfeed collect --explain', 'agentfeed share --dry'];
  }

  const latest = rows.find((row) => row.valid);
  if (!latest) {
    return ['agentfeed collect --explain'];
  }

  return uniqueNextCommands([
    `agentfeed preview --id ${latest.id}`,
    latest.status === 'uploaded' ? `agentfeed open --id ${latest.id}` : `agentfeed publish --id ${latest.id} --yes`
  ]);
}

export function openNextActions(draftId: string): string[] {
  return uniqueNextCommands([
    `agentfeed preview --id ${draftId}`,
    'agentfeed status'
  ]);
}
