const SENSITIVE_ENV_EXACT_NAMES = new Set([
  'AGENTFEED_TOKEN',
  'AGENTFEED_INGESTION_TOKEN',
  'ANTHROPIC_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AZURE_CLIENT_SECRET',
  'CLOUDFLARE_API_TOKEN',
  'GEMINI_API_KEY',
  'GITHUB_TOKEN',
  'GITLAB_TOKEN',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'NODE_AUTH_TOKEN',
  'NPM_TOKEN',
  'OPENAI_API_KEY',
  'PGPASSWORD',
  'DATABASE_URL',
  'REDIS_URL',
  'SSH_AUTH_SOCK'
]);

const SENSITIVE_ENV_NAME_PATTERNS = [
  /(^|_)(AUTH|COOKIE|CREDENTIAL|CREDENTIALS|PASSWORD|PASS|PRIVATE_KEY|SECRET|SESSION|TOKEN)$/i,
  /(^|_)DATABASE_URL$/i,
  /(^|_)REDIS_URL$/i,
  /^NPM_CONFIG_.*(_AUTH|TOKEN)$/i
];

function configuredCommandEnvAllowlist(baseEnv: NodeJS.ProcessEnv): Set<string> {
  return new Set((baseEnv.AGENTFEED_CONFIGURED_COMMAND_ENV_ALLOWLIST ?? '')
    .split(',')
    .map((name) => name.trim().toUpperCase())
    .filter(Boolean));
}

function isSensitiveEnvName(name: string): boolean {
  const upperName = name.toUpperCase();
  return SENSITIVE_ENV_EXACT_NAMES.has(upperName) || SENSITIVE_ENV_NAME_PATTERNS.some((pattern) => pattern.test(upperName));
}

export function sensitiveEnvironmentNames(baseEnv: NodeJS.ProcessEnv = process.env): string[] {
  const names = new Set<string>(SENSITIVE_ENV_EXACT_NAMES);
  for (const name of Object.keys(baseEnv)) {
    if (isSensitiveEnvName(name)) names.add(name);
  }
  return [...names].filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)).sort();
}

export function createScrubbedCommandEnv(baseEnv: NodeJS.ProcessEnv = process.env, options: { respectAllowlist?: boolean } = {}): NodeJS.ProcessEnv {
  const respectAllowlist = options.respectAllowlist ?? true;
  const allowlist = respectAllowlist ? configuredCommandEnvAllowlist(baseEnv) : new Set<string>();
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(baseEnv)) {
    if (value === undefined) continue;
    if (isSensitiveEnvName(name) && !allowlist.has(name.toUpperCase())) continue;
    env[name] = value;
  }
  return env;
}
