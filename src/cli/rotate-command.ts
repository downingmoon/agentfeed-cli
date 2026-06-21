import { checkIngestionToken } from '../api/client.js';
import { browserLogin } from '../auth/browser-login.js';
import { loadCredentialsWithMetadata } from '../config/credentials.js';
import type { AgentFeedCredentials } from '../types.js';
import { flag, option } from './args.js';
import { renderCredentialResultLines } from './auth-output.js';
import { rotateCredentialResult } from './auth-result.js';

interface RotateCommandIo {
  readonly cwd: string;
  readonly printLines: (lines: readonly string[]) => void;
}

async function replacementTokenIdForSavedCredentials(creds: AgentFeedCredentials): Promise<string | undefined> {
  const check = await checkIngestionToken(creds);
  const id = check.ok && typeof check.data?.token?.id === 'string' && check.data.token.id.length > 0
    ? check.data.token.id
    : undefined;
  return id;
}

async function rotateViaBrowserLogin(args: string[], message: string, io: RotateCommandIo, replaceTokenId?: string): Promise<void> {
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  const existing = await loadCredentialsWithMetadata({ cwd: io.cwd });
  const creds = await browserLogin({
    apiBaseUrl,
    noOpen: flag(args, '--no-open'),
    save: !noSave,
    cwd: io.cwd,
    storedApiBaseUrl: existing.credentials?.api_base_url,
    allowCiBrowser: flag(args, '--browser'),
    replaceTokenId: noSave ? undefined : replaceTokenId
  });
  io.printLines(renderCredentialResultLines(rotateCredentialResult({ noSave, credentials: creds, message })));
}

export async function runRotateCommand(args: string[], io: RotateCommandIo): Promise<void> {
  const forceBrowser = flag(args, '--browser');
  const noSave = flag(args, '--no-save');
  const credentialResolution = await loadCredentialsWithMetadata({ cwd: io.cwd });
  const creds = credentialResolution.credentials;
  if (forceBrowser || noSave || !creds) {
    const replaceTokenId = creds && !noSave ? await replacementTokenIdForSavedCredentials(creds) : undefined;
    await rotateViaBrowserLogin(
      args,
      creds
        ? replaceTokenId
          ? 'AgentFeed browser rotation complete. Previous saved token was revoked.'
          : 'AgentFeed browser replacement complete. Previous saved token could not be verified for revocation.'
        : 'No saved token found. Starting browser login replacement.',
      io,
      replaceTokenId,
    );
    return;
  }
  if (credentialResolution.token_source === 'environment') {
    throw new Error([
      'AGENTFEED_TOKEN is set, so AgentFeed cannot update that environment variable in-place.',
      'Rotate or issue a new token in AgentFeed Settings, then update AGENTFEED_TOKEN in your shell or secret manager.',
      'Alternatively run: unset AGENTFEED_TOKEN && agentfeed rotate --browser',
      'Then verify with: agentfeed status',
    ].join('\n'));
  }
  const replaceTokenId = await replacementTokenIdForSavedCredentials(creds);
  await rotateViaBrowserLogin(
    args,
    replaceTokenId
      ? 'AgentFeed token rotated after browser approval. Previous saved token was revoked.'
      : 'Saved token could not be verified. Browser login issued a replacement token, but the previous token may need manual revocation in Settings.',
    io,
    replaceTokenId,
  );
}
