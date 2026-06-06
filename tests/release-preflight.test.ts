import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  commandShimExecOptions,
  installedBinExecOptions,
  installedBinPath,
  npmCommand,
  isDirectInvocation,
  parsePackJson,
  validateCliSmokeOutput,
  validateCliVersionOutput,
  validateInstalledPackageSmokeResult,
  validateInstalledPackageWorkflowSmokeResult,
  validatePackageMetadata,
  validatePackResult,
  validateReleaseGitRef,
  validateTrustedPublishingWorkflow
} from '../scripts/release-preflight.mjs';

const validPackageJson = {
  name: 'agentfeed-cli',
  version: '0.2.0',
  description: 'AgentFeed CLI for publishing safe AI worklogs',
  license: 'UNLICENSED',
  engines: {
    node: '>=20'
  },
  packageManager: 'npm@11.6.0',
  bin: {
    agentfeed: './dist/cli/index.js'
  },
  files: ['dist', 'README.md'],
  scripts: {
    prepack: 'npm run clean && npm run build && npm run typecheck && npm test -- --run',
    'release:preflight': 'npm run prepack && node scripts/release-preflight.mjs'
  },
  repository: {
    type: 'git',
    url: 'git+https://github.com/downingmoon/agentfeed-cli.git'
  },
  homepage: 'https://agentfeed.dev',
  bugs: {
    url: 'https://github.com/downingmoon/agentfeed-cli/issues'
  },
  publishConfig: {
    access: 'public',
    provenance: true
  }
};

const validTrustedPublishingWorkflow = `
name: Release

on:
  workflow_dispatch:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write

concurrency:
  group: npm-release-\${{ github.ref }}
  cancel-in-progress: false

jobs:
  publish:
    runs-on: ubuntu-latest
    environment: npm-publish
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6
      - uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6
        with:
          node-version: 22.14.0
          registry-url: https://registry.npmjs.org
      - name: Verify release tag matches package version
        run: |
          const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
          const expectedTag = \`v\${pkg.version}\`;
          const refType = process.env.GITHUB_REF_TYPE || '';
          const refName = process.env.GITHUB_REF_NAME || '';
          if (refType !== 'tag' || refName !== expectedTag) throw new Error('bad release ref');
      - run: npm install -g npm@11.6.0
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run prepack
      - run: npm run release:preflight
      - run: npm publish --access public
`;

const validPackResult = [{
  name: 'agentfeed-cli',
  version: '0.2.0',
  files: [
    { path: 'package/README.md' },
    { path: 'package/package.json' },
    { path: 'package/dist/cli/index.js' },
    { path: 'package/dist/version.js' }
  ],
  entryCount: 4,
  unpackedSize: 1234
}];

describe('release preflight guardrails', () => {
  it('parses npm pack JSON even when lifecycle output appears first', () => {
    const output = [
      '> agentfeed-cli@0.2.0 prepack',
      '> npm run clean && npm run build',
      JSON.stringify(validPackResult, null, 2)
    ].join('\n');

    expect(parsePackJson(output)).toEqual(validPackResult);
  });

  it('rejects npm pack output without a parseable JSON result', () => {
    expect(() => parsePackJson('> prepack\nnot-json')).toThrow('parseable JSON');
  });

  it('validates required packed files and rejects local-only payloads', () => {
    expect(() => validatePackResult(validPackResult, validPackageJson)).not.toThrow();

    expect(() => validatePackResult([{
      ...validPackResult[0],
      files: validPackResult[0].files.filter(file => file.path !== 'package/dist/version.js')
    }], validPackageJson)).toThrow('dist/version.js');

    expect(() => validatePackResult([{
      ...validPackResult[0],
      files: [...validPackResult[0].files, { path: 'package/src/cli/index.ts' }]
    }], validPackageJson)).toThrow('src/');

    for (const forbidden of ['docs/todo.md', 'obsidian-vault/Home.md', 'AGENTS.md', '.github/workflows/ci.yml']) {
      expect(() => validatePackResult([{
        ...validPackResult[0],
        files: [...validPackResult[0].files, { path: `package/${forbidden}` }]
      }], validPackageJson)).toThrow();
    }
  });

  it('validates npm release metadata contract', () => {
    expect(() => validatePackageMetadata(validPackageJson)).not.toThrow();

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      files: ['dist', 'README.md', 'obsidian-vault']
    })).toThrow('exactly');

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      publishConfig: {
        access: 'restricted',
        provenance: true
      }
    })).toThrow('publishConfig.access');

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      publishConfig: {
        access: 'public',
        provenance: false
      }
    })).toThrow('publishConfig.provenance');

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      private: true
    })).toThrow('must not be marked private');
  });

  it('validates the trusted publishing workflow contract', () => {
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow)).not.toThrow();
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('id-token: write', 'id-token: read'))).toThrow('id-token');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('concurrency:', 'release_concurrency:'))).toThrow('concurrency');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('group: npm-release-${{ github.ref }}', 'group: npm-release'))).toThrow('github.ref');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('cancel-in-progress: false', 'cancel-in-progress: true'))).toThrow('must not cancel');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('node-version: 22.14.0', 'node-version: 20'))).toThrow('Node.js 22.14.0');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('npm install -g npm@11.6.0', 'npm install -g npm@10'))).toThrow('npm 11.6.0');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace(/      - name: Verify release tag matches package version[\s\S]*?      - run: npm install -g npm@11\.6\.0/, '      - run: npm install -g npm@11.6.0'))).toThrow('matching version tag');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('expectedTag = `v${pkg.version}`', 'expectedTag = process.env.GITHUB_REF_NAME'))).toThrow('package.json version');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace(
      '      - name: Verify release tag matches package version',
      '      - run: npm ci\n      - name: Verify release tag matches package version'
    ))).toThrow('before installing dependencies');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('      - run: npm audit --audit-level=high\n', ''))).toThrow('audit');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('      - run: npm run prepack\n', ''))).toThrow('prepack');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace(
      '      - run: npm run prepack\n      - run: npm run release:preflight',
      '      - run: npm run release:preflight\n      - run: npm run prepack'
    ))).toThrow('prepack');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace(
      'actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6',
      'actions/checkout@v6'
    ))).toThrow('commit SHA');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace(
      'actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6',
      'actions/setup-node@0000000000000000000000000000000000000000 # v6'
    ))).toThrow('48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e');
    expect(() => validateTrustedPublishingWorkflow(`${validTrustedPublishingWorkflow}\n      - uses: actions/checkout@v6\n`)).toThrow('commit SHA');
    expect(() => validateTrustedPublishingWorkflow(`${validTrustedPublishingWorkflow}\n      - uses: actions/setup-node@v6\n`)).toThrow('commit SHA');
    expect(() => validateTrustedPublishingWorkflow(validTrustedPublishingWorkflow.replace('npm publish --access public', 'npm publish --provenance --access public'))).toThrow('must not pass --provenance');
    expect(() => validateTrustedPublishingWorkflow(`${validTrustedPublishingWorkflow}\n      - run: echo "$NODE_AUTH_TOKEN"\n`)).toThrow('long-lived npm tokens');
  });

  it('requires native Windows DPAPI and npm package wrapper smoke coverage in CI', () => {
    const ciWorkflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
    const windowsJobIndex = ciWorkflow.indexOf('runs-on: windows-latest');
    const nativeSmokeFlagIndex = ciWorkflow.indexOf('AGENTFEED_RUN_NATIVE_KEYCHAIN_TESTS: 1');
    const nativeSmokeCommandIndex = ciWorkflow.indexOf('npm test -- --run tests/config.test.ts -t "native Windows DPAPI"');
    const windowsJob = windowsJobIndex === -1 ? '' : ciWorkflow.slice(windowsJobIndex);
    const windowsBuildIndex = windowsJob.indexOf('npm run build');
    const windowsNativeSmokeIndex = windowsJob.indexOf('npm test -- --run tests/config.test.ts -t "native Windows DPAPI"');
    const windowsPackageWrapperSmokeIndex = windowsJob.indexOf('node scripts/release-preflight.mjs');

    expect(windowsJobIndex).toBeGreaterThan(-1);
    expect(windowsBuildIndex).toBeGreaterThan(-1);
    expect(windowsNativeSmokeIndex).toBeGreaterThan(windowsBuildIndex);
    expect(windowsPackageWrapperSmokeIndex).toBeGreaterThan(windowsNativeSmokeIndex);
    expect(nativeSmokeFlagIndex).toBeGreaterThan(windowsJobIndex);
    expect(nativeSmokeCommandIndex).toBeGreaterThan(nativeSmokeFlagIndex);
    expect(ciWorkflow).not.toContain('AGENTFEED_ALLOW_INSECURE_CREDENTIAL_STORE: 1');
  });

  it('keeps the CI workflow from relying on test side effects or production-only audit scope', () => {
    const ciWorkflow = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
    const installNpmIndex = ciWorkflow.indexOf('npm install -g npm@11.6.0');
    const installDependenciesIndex = ciWorkflow.indexOf('npm ci');
    const buildIndex = ciWorkflow.indexOf('npm run build');
    const preflightIndex = ciWorkflow.indexOf('npm run release:preflight');

    expect(ciWorkflow).toContain('node-version: 22.14.0');
    expect(installNpmIndex).toBeGreaterThan(-1);
    expect(installDependenciesIndex).toBeGreaterThan(-1);
    expect(installNpmIndex).toBeLessThan(installDependenciesIndex);
    expect(buildIndex).toBeGreaterThan(-1);
    expect(preflightIndex).toBeGreaterThan(-1);
    expect(buildIndex).toBeLessThan(preflightIndex);
    expect(ciWorkflow).toContain('npm audit --audit-level=high');
    expect(ciWorkflow).not.toContain('npm audit --omit=dev');
  });

  it('documents polished CLI onboarding and current command flow', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');

    expect(readme).toContain('terminal-first feel as modern agent CLIs');
    expect(readme).toContain('agentfeed commands');
    expect(readme).toContain('guided workflows');
    expect(readme).toContain('when to use each command');
    expect(readme).toContain('agentfeed share --dry');
    expect(readme).toContain('agentfeed share --yes --open-review');
    expect(readme).toContain('Upload skipped: AgentFeed token is missing');
    expect(readme).toContain('agentfeed collect --explain');
    expect(readme).toContain('agentfeed preview --latest');
    expect(readme).toContain('agentfeed publish --latest --yes');
    expect(readme).toContain('AGENTFEED_ALLOW_INSECURE_API=1');
    expect(readme).toContain('AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1');
    expect(readme).toContain('agentfeed completion zsh > _agentfeed');
    expect(readme).toContain('Move the generated file into your shell completion directory');
    expect(readme).not.toContain('Local CLI MVP');
    expect(readme).not.toContain('agentfeed completion bash > ~/.local/share/bash-completion/completions/agentfeed');
  });

  it('documents Windows DPAPI credential storage policy', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
    const credentialStorageSection = readme.slice(readme.indexOf('### Credential storage policy'));

    expect(credentialStorageSection).toContain('Windows DPAPI');
    expect(credentialStorageSection).toContain('macOS');
    expect(credentialStorageSection).toContain('Linux');
    expect(credentialStorageSection).toContain('does **not** silently downgrade to file storage');
  });

  it('requires GitHub release runs to publish only from the matching version tag', () => {
    expect(() => validateReleaseGitRef(validPackageJson, {})).not.toThrow();
    expect(() => validateReleaseGitRef(validPackageJson, {
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKFLOW: 'CI',
      GITHUB_REF_TYPE: 'branch',
      GITHUB_REF_NAME: 'main'
    })).not.toThrow();
    expect(() => validateReleaseGitRef(validPackageJson, {
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKFLOW: 'Release',
      GITHUB_REF_TYPE: 'tag',
      GITHUB_REF_NAME: 'v0.2.0'
    })).not.toThrow();

    expect(() => validateReleaseGitRef(validPackageJson, {
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKFLOW: 'Release',
      GITHUB_REF_TYPE: 'branch',
      GITHUB_REF_NAME: 'main'
    })).toThrow('matching version tag');
    expect(() => validateReleaseGitRef(validPackageJson, {
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKFLOW: 'Release',
      GITHUB_REF_TYPE: 'tag',
      GITHUB_REF_NAME: 'v0.2.1'
    })).toThrow('v0.2.0');
    expect(() => validateReleaseGitRef(validPackageJson, {
      GITHUB_ACTIONS: 'true',
      GITHUB_WORKFLOW_REF: 'downingmoon/agentfeed-cli/.github/workflows/release.yml@refs/tags/v0.2.0',
      GITHUB_REF: 'refs/tags/v0.2.0'
    })).not.toThrow();
  });

  it('validates the built CLI help and version smoke output', () => {
    expect(() => validateCliSmokeOutput('Usage: agentfeed <init|collect>\nVersion: 0.2.0\nagentfeed collect\n')).not.toThrow();
    expect(() => validateCliSmokeOutput('Usage: other')).toThrow('usage banner');
    expect(() => validateCliSmokeOutput('Usage: agentfeed <init|collect>\nagentfeed collect\n')).toThrow('installed package version');
    expect(() => validateCliSmokeOutput('Usage: agentfeed <init|collect>\nVersion: 0.2.0')).toThrow('collection guidance');
    expect(() => validateCliVersionOutput('0.2.0\n', validPackageJson)).not.toThrow();
    expect(() => validateCliVersionOutput('0.2.1\n', validPackageJson)).toThrow('package.json version');
  });


  it('builds platform-specific installed bin paths and executes Windows cmd shims through a shell', () => {
    expect(installedBinPath('/tmp/install', 'linux')).toContain('node_modules/.bin/agentfeed');
    expect(installedBinPath('C:/tmp/install', 'win32').replace(/\\/g, '/')).toContain('node_modules/.bin/agentfeed.cmd');
    expect(commandShimExecOptions('linux')).toEqual({});
    expect(commandShimExecOptions('win32')).toEqual({ shell: true });
    expect(installedBinExecOptions('linux')).toEqual({});
    expect(installedBinExecOptions('win32')).toEqual({ shell: true });
    expect(npmCommand('linux')).toBe('npm');
    expect(npmCommand('win32')).toBe('npm.cmd');
  });

  it('validates installed tarball CLI smoke output', () => {
    expect(() => validateInstalledPackageSmokeResult({
      command: 'agentfeed',
      helpOutput: 'Usage: agentfeed <init|collect>\nVersion: 0.2.0\nagentfeed collect\n',
      versionOutput: '0.2.0\n'
    }, validPackageJson)).not.toThrow();

    expect(() => validateInstalledPackageSmokeResult({
      command: 'node dist/cli/index.js',
      helpOutput: 'Usage: agentfeed <init|collect>\nVersion: 0.2.0\nagentfeed collect\n',
      versionOutput: '0.2.0\n'
    }, validPackageJson)).toThrow('installed agentfeed binary');

    expect(() => validateInstalledPackageSmokeResult({
      command: 'agentfeed',
      helpOutput: 'Usage: agentfeed <init|collect>\nVersion: 0.2.0\nagentfeed collect\n',
      versionOutput: '0.2.1\n'
    }, validPackageJson)).toThrow('package.json version');
  });

  it('validates installed tarball first-run workflow smoke output', () => {
    const validWorkflowSmoke = {
      command: 'agentfeed',
      initOutput: 'AgentFeed initialized\nRecommended order:\n  1. agentfeed login\n',
      statusOutput: 'AgentFeed status\nHealth: setup needed\nProject initialized: yes\n',
      shareDryOutput: 'AgentFeed share preview\nDry run complete. Local draft kept: draft_1\nRecommended order:\n',
      draftsOutput: 'AgentFeed drafts (1)\nRecommended order:\n'
    };

    expect(() => validateInstalledPackageWorkflowSmokeResult(validWorkflowSmoke)).not.toThrow();
    expect(() => validateInstalledPackageWorkflowSmokeResult({
      ...validWorkflowSmoke,
      command: 'node dist/cli/index.js'
    })).toThrow('installed agentfeed binary');
    expect(() => validateInstalledPackageWorkflowSmokeResult({
      ...validWorkflowSmoke,
      shareDryOutput: 'AgentFeed share preview\nRecommended order:\n'
    })).toThrow('share --dry');
    expect(() => validateInstalledPackageWorkflowSmokeResult({
      ...validWorkflowSmoke,
      draftsOutput: 'AgentFeed drafts (0)\nRecommended order:\n'
    })).toThrow('created draft');
  });

  it('runs only when invoked as this script, including Windows-style paths', () => {
    expect(isDirectInvocation(
      '/repo/agentfeed-cli/scripts/release-preflight.mjs',
      '/repo/agentfeed-cli/scripts/release-preflight.mjs'
    )).toBe(true);
    expect(isDirectInvocation(
      'C:\\repo\\agentfeed-cli\\scripts\\release-preflight.mjs',
      'C:/repo/agentfeed-cli/scripts/release-preflight.mjs'
    )).toBe(true);
    expect(isDirectInvocation(
      '/repo/agentfeed-cli/scripts/other.mjs',
      '/repo/agentfeed-cli/scripts/release-preflight.mjs'
    )).toBe(false);
  });
});
