import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parsePackJson,
  validatePackageMetadata,
  validatePackResult,
  validateReleaseGitRef
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
  homepage: 'https://github.com/downingmoon/agentfeed-cli#readme',
  bugs: {
    url: 'https://github.com/downingmoon/agentfeed-cli/issues'
  },
  publishConfig: {
    access: 'public',
    provenance: true
  }
};

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

    expect(ciWorkflow).toContain('pull_request:');
    expect(ciWorkflow).toContain('workflow_dispatch:');
    expect(ciWorkflow).not.toContain('\n  push:');
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

});
