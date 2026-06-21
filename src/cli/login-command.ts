import { browserLogin } from '../auth/browser-login.js';
import { requireValidLoginTokenBeforeCredentialSave } from '../auth/login-token-validation.js';
import { credentialsFromToken, loadCredentialsWithMetadata, saveCredentials } from '../config/credentials.js';
import { flag, option } from './args.js';
import { browserLoginCredentialResult, credentialJsonResult, tokenLoginCredentialResult } from './auth-result.js';
import { renderCredentialResultLines } from './auth-output.js';
import { resolveLoginTokenInput } from './auth-token-input.js';
import { requireApiCompatibilityBeforeCredentialSave } from './upload-preflight.js';

interface LoginCommandIo {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
  readonly print: (text: string) => void;
  readonly printLines: (lines: readonly string[]) => void;
}

async function readStdinText(): Promise<string> {
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

export async function runLoginCommand(args: string[], io: LoginCommandIo): Promise<void> {
  const tokenOption = option(args, '--token');
  const json = flag(args, '--json');
  const token = await resolveLoginTokenInput({
    tokenOption,
    tokenStdinFlag: flag(args, '--token-stdin'),
    json,
    allowUnsafeArgvToken: io.env.AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN === '1',
    readStdinText
  });
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  if (!token) {
    if (json) {
      throw new Error([
        'login --json requires token input so stdout stays machine-readable.',
        'Run: printf %s "$TOKEN" | agentfeed login --token-stdin --json',
        'Run: printf %s "$TOKEN" | agentfeed login --token - --json --no-save'
      ].join('\n'));
    }
    const existing = await loadCredentialsWithMetadata({ cwd: io.cwd });
    const creds = await browserLogin({
      apiBaseUrl,
      noOpen: flag(args, '--no-open'),
      save: !noSave,
      cwd: io.cwd,
      storedApiBaseUrl: existing.credentials?.api_base_url,
      allowCiBrowser: flag(args, '--browser')
    });
    const warnings: string[] = [];
    if (!noSave) {
      const saved = await loadCredentialsWithMetadata({ cwd: io.cwd });
      warnings.push(...saved.warnings);
    }
    io.printLines(renderCredentialResultLines(browserLoginCredentialResult({ noSave, credentials: creds, warnings })));
    return;
  }

  const loginApiOptions = {
    apiBaseUrl,
    cwd: io.cwd,
    trustRepoDiscoveredApiBase: io.env.AGENTFEED_TRUST_REPO_API_BASE === '1'
  };
  const tokenCredentials = await credentialsFromToken(token, loginApiOptions);
  if (!noSave) await requireApiCompatibilityBeforeCredentialSave(tokenCredentials.api_base_url);
  await requireValidLoginTokenBeforeCredentialSave(tokenCredentials);
  const creds = noSave
    ? tokenCredentials
    : await saveCredentials(token, { ...loginApiOptions, apiBaseUrl: tokenCredentials.api_base_url });
  const warnings: string[] = [];
  if (!noSave) {
    const saved = await loadCredentialsWithMetadata({ cwd: io.cwd });
    warnings.push(...saved.warnings);
  }
  const next = noSave ? ['agentfeed status'] : ['agentfeed status', 'agentfeed share --dry'];
  if (json) {
    io.print(JSON.stringify(credentialJsonResult({
      saved: !noSave,
      credentials: creds,
      warnings,
      next
    }), null, 2));
    return;
  }
  io.printLines(renderCredentialResultLines(tokenLoginCredentialResult({ noSave, credentials: creds, warnings })));
}
