import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createEmptyDraft } from '../src/draft/create.js';
import { AGENTFEED_CLI_VERSION, AGENTFEED_TOOL_VERSION } from '../src/version.js';

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  name: string;
  version: string;
  bin?: Record<string, string>;
  bugs?: {
    url?: string;
  };
  scripts?: Record<string, string>;
  homepage?: string;
  keywords?: string[];
  packageManager?: string;
  repository?: {
    type?: string;
    url?: string;
  };
  files?: string[];
  license?: string;
  publishConfig?: {
    access?: string;
  };
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
    expect(packageJson.scripts?.postbuild).toBe('node scripts/ensure-bin-executable.mjs');
    expect(packageJson.scripts?.prepack).toBe('npm run clean && npm run build && npm run typecheck && npm test -- --run');
    expect(packageJson.scripts?.['release:preflight']).toBe('node scripts/release-preflight.mjs');
  });

  it('declares npm launch metadata for discovery, support, and reproducibility', () => {
    expect(packageJson.keywords).toEqual(expect.arrayContaining([
      'agentfeed',
      'ai-agent',
      'worklog',
      'cli',
      'codex',
      'claude-code',
      'gemini-cli',
      'cursor'
    ]));
    expect(packageJson.homepage).toBe('https://agentfeed.dev');
    expect(packageJson.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/downingmoon/agentfeed-cli.git'
    });
    expect(packageJson.bugs?.url).toBe('https://github.com/downingmoon/agentfeed-cli/issues');
    expect(packageJson.packageManager).toBe('npm@11.6.0');
    expect(packageJson.publishConfig?.access).toBe('public');
    expect(packageJson.license).toBe('UNLICENSED');
  });

  it('keeps the release preflight tarball and provenance guardrails documented', () => {
    const releaseScript = readFileSync(resolve('scripts/release-preflight.mjs'), 'utf8');
    const readme = readFileSync(resolve('README.md'), 'utf8');
    expect(releaseScript).toContain("execFileSync('npm', ['pack', '--dry-run', '--json']");
    expect(releaseScript).toContain("fileSet.has('dist/cli/index.js')");
    expect(releaseScript).toContain("files.some(file => file === forbidden.replace");
    expect(releaseScript).toContain("pkg.publishConfig?.access === 'public'");
    expect(readme).toContain('npm run release:preflight');
    expect(readme).toContain('npm publish --provenance --access public');
    expect(readme).toContain('https://docs.npmjs.com/generating-provenance-statements');
  });
});
