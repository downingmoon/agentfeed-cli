import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { AGENTFEED_CLI_VERSION, AGENTFEED_TOOL_VERSION } from '../src/version.js';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  name: string;
  version: string;
  bin?: Record<string, string>;
  scripts?: Record<string, string>;
  files?: string[];
};
const packageVersion = packageJson.version;

describe('CLI version metadata', () => {
  it('uses package.json as the single source for emitted tool metadata', () => {
    expect(AGENTFEED_CLI_VERSION).toBe(packageVersion);
    expect(AGENTFEED_TOOL_VERSION).toBe(`agentfeed-cli/${packageVersion}`);
    expect(createEmptyDraft({
      projectName: 'agentfeed-cli',
      projectRoot: '/tmp/agentfeed-cli',
      source: 'codex'
    }).source.tool_version).toBe(AGENTFEED_TOOL_VERSION);
  });

  it('builds dist before npm packaging', () => {
    expect(packageJson.name).toBe('agentfeed-cli');
    expect(packageJson.bin?.agentfeed).toBe('./dist/cli/index.js');
    expect(packageJson.files).toContain('dist');
    expect(packageJson.scripts?.prepack).toBe('npm run clean && npm run build && npm run typecheck && npm test -- --run');
  });
});
