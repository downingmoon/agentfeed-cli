import { previewDraftRemote, type RemotePreviewResult } from '../api/client.js';
import { loadCredentials } from '../config/credentials.js';
import { readDraft } from '../draft/read.js';
import type { LocalDraft } from '../types.js';
import { missingTokenMessage } from './auth-token-input.js';
import { sanitizeDraftForCliOutput } from './draft-output-sanitizer.js';
import { requireApiCompatibilityBeforeUpload } from './upload-preflight.js';

export type PreviewExecutionOptions = {
  readonly cwd: string;
  readonly id: string;
  readonly remote: boolean;
};

export type PreviewExecutionResult =
  | { readonly kind: 'local'; readonly draft: LocalDraft }
  | { readonly kind: 'remote'; readonly draft: LocalDraft; readonly remote: RemotePreviewResult };

async function sanitizedDraftForPreview(cwd: string, id: string): Promise<LocalDraft> {
  return await sanitizeDraftForCliOutput(cwd, await readDraft(cwd, id));
}

export async function runPreviewCommand(options: PreviewExecutionOptions): Promise<PreviewExecutionResult> {
  const draft = await sanitizedDraftForPreview(options.cwd, options.id);
  if (!options.remote) return { kind: 'local', draft };

  const creds = await loadCredentials();
  if (!creds) throw new Error(missingTokenMessage());
  await requireApiCompatibilityBeforeUpload(creds.api_base_url);
  return {
    kind: 'remote',
    draft,
    remote: await previewDraftRemote(draft, creds)
  };
}
