import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const SEMVER_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function packageVersionFromMetadata(metadata: unknown): string {
  if (!isRecord(metadata) || typeof metadata.version !== 'string' || !SEMVER_VERSION_PATTERN.test(metadata.version)) {
    throw new Error('AgentFeed package metadata is missing a valid semver version.');
  }
  return metadata.version;
}

const packageJson: unknown = require('../package.json');

export const AGENTFEED_CLI_VERSION = packageVersionFromMetadata(packageJson);
export const AGENTFEED_TOOL_VERSION = `agentfeed-cli/${AGENTFEED_CLI_VERSION}`;
