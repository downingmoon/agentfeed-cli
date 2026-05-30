import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version?: string };

export const AGENTFEED_CLI_VERSION = packageJson.version ?? '0.0.0';
export const AGENTFEED_TOOL_VERSION = `agentfeed-cli/${AGENTFEED_CLI_VERSION}`;
