import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

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
  'SSH_AUTH_SOCK'
]);

const SENSITIVE_ENV_NAME_PATTERNS = [
  /(^|_)(AUTH|COOKIE|CREDENTIAL|CREDENTIALS|PASSWORD|PASS|PRIVATE_KEY|SECRET|SESSION|TOKEN)$/i,
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

export function createScrubbedCommandEnv(baseEnv: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const allowlist = configuredCommandEnvAllowlist(baseEnv);
  const env: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(baseEnv)) {
    if (value === undefined) continue;
    if (isSensitiveEnvName(name) && !allowlist.has(name.toUpperCase())) continue;
    env[name] = value;
  }
  return env;
}

export async function run(command: string, args: string[], cwd: string, options: RunOptions = {}): Promise<{ ok: boolean; stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd, timeout: options.timeoutMs ?? 120_000, maxBuffer: 1024 * 1024 * 5, env: options.env });
    return { ok: true, stdout: String(stdout), stderr: String(stderr) };
  } catch (error) {
    const err = error as { stdout?: string | Buffer; stderr?: string | Buffer };
    return { ok: false, stdout: String(err.stdout ?? ''), stderr: String(err.stderr ?? '') };
  }
}
