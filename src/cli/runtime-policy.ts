import { cwd as defaultCwd } from 'node:process';
import { loadProjectConfig as defaultLoadProjectConfig } from '../config/project-config.js';
import type { AgentFeedProjectConfig } from '../types.js';

export const CI_ENVIRONMENT_VARIABLES = [
  'AGENTFEED_CI',
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'BUILDKITE',
  'CIRCLECI',
  'JENKINS_URL',
  'TF_BUILD',
  'TEAMCITY_VERSION',
  'VERCEL',
  'NETLIFY'
] as const;

type RuntimePolicyEnvironment = Readonly<Record<string, string | undefined>>;

type LoadProjectConfig = (cwd?: string) => Promise<AgentFeedProjectConfig>;

export type ReviewOpenPolicyOptions = {
  readonly respectConfig?: boolean;
  readonly noOpen?: boolean;
  readonly env?: RuntimePolicyEnvironment;
  readonly cwd?: string;
  readonly loadProjectConfig?: LoadProjectConfig;
};

export function isTruthyEnvironmentValue(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

export function isCiEnvironment(env: RuntimePolicyEnvironment = process.env): boolean {
  return CI_ENVIRONMENT_VARIABLES.some((name) => isTruthyEnvironmentValue(env[name]));
}

export function shouldRequireUploadConfirmation(options: { readonly json?: boolean; readonly yes?: boolean }): boolean {
  if (options.json || options.yes) return false;
  return true;
}

export async function shouldOpenReviewAfterUpload(openFlag: boolean, options: ReviewOpenPolicyOptions = {}): Promise<boolean> {
  if (options.noOpen) return false;
  if (openFlag) return true;
  if (isCiEnvironment(options.env)) return false;
  if (options.respectConfig === false) return false;
  const loadProjectConfig = options.loadProjectConfig ?? defaultLoadProjectConfig;
  const cwd = options.cwd ?? defaultCwd();
  try {
    const config = await loadProjectConfig(cwd);
    return config.collection.open_review_after_upload;
  } catch (error) {
    if (error instanceof Error) return false;
    return false;
  }
}
