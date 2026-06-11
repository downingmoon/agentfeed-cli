import type { LocalDraft } from '../types.js';
import { uploadNextActions } from './upload-guidance.js';

function uniqueNextCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function previewNextActions(draft: LocalDraft): string[] {
  return uniqueNextCommands([
    draft.upload.uploaded ? `agentfeed open --id ${draft.id}` : `agentfeed publish --id ${draft.id} --yes`,
    `agentfeed scan --id ${draft.id}`
  ]);
}

export function collectJsonNextActions(draft: LocalDraft): string[] {
  return draft.upload.uploaded
    ? uploadNextActions(draft.id)
    : uniqueNextCommands([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
}

export function remotePreviewNextActions(draftId: string, valid: boolean): string[] {
  return valid
    ? uniqueNextCommands([`agentfeed publish --id ${draftId} --yes`, `agentfeed scan --id ${draftId}`])
    : uniqueNextCommands([`agentfeed scan --id ${draftId}`, `agentfeed preview --id ${draftId} --remote`]);
}
