export const SAFE_TOKEN_STDIN_COMMAND = 'printf %s "$TOKEN" | agentfeed login --token-stdin';

export type LoginTokenInputOptions = {
  readonly tokenOption?: string;
  readonly tokenStdinFlag: boolean;
  readonly json: boolean;
  readonly allowUnsafeArgvToken: boolean;
  readonly readStdinText: () => Promise<string>;
};

export function emptyTokenStdinMessage(): string {
  return [
    'No token received on stdin.',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`,
    'Run: agentfeed login'
  ].join('\n');
}

export function unsafeArgvTokenMessage(): string {
  return [
    'Literal token input through --token <token> is disabled.',
    'Reason: argv can leak through shell history and process listings.',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`,
    'Run: agentfeed login',
    'For local throwaway development only: AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1 agentfeed login --token <token>'
  ].join('\n');
}

export function missingTokenMessage(): string {
  return [
    'AgentFeed token is missing.',
    'Run: agentfeed login',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`
  ].join('\n');
}

export function jsonTokenRequiredMessage(): string {
  return [
    'login --json requires token input so stdout stays machine-readable.',
    'Run: printf %s "$TOKEN" | agentfeed login --token-stdin --json',
    'Run: printf %s "$TOKEN" | agentfeed login --token - --json --no-save'
  ].join('\n');
}

async function readTokenFromStdin(readStdinText: () => Promise<string>): Promise<string> {
  const token = (await readStdinText()).trim();
  if (!token) throw new Error(emptyTokenStdinMessage());
  return token;
}

export async function resolveLoginTokenInput(options: LoginTokenInputOptions): Promise<string | undefined> {
  const tokenFromStdin = options.tokenStdinFlag || options.tokenOption === '-';
  if (options.tokenOption && options.tokenOption !== '-' && tokenFromStdin) {
    throw new Error('Use only one token input method: --token -, or --token-stdin.');
  }
  if (options.tokenOption && options.tokenOption !== '-' && !options.allowUnsafeArgvToken) {
    throw new Error(unsafeArgvTokenMessage());
  }
  if (tokenFromStdin) return readTokenFromStdin(options.readStdinText);
  if (!options.tokenOption && options.json) throw new Error(jsonTokenRequiredMessage());
  return options.tokenOption;
}
