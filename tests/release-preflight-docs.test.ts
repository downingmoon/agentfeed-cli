import { describe, expect, it } from 'vitest';
import { readCiWorkflow, readReadme } from './release-preflight-helpers.js';

describe('release preflight CI and README guardrails', () => {
  it('requires native Windows DPAPI and npm package wrapper smoke coverage in CI', () => {
    const ciWorkflow = readCiWorkflow();
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
    const ciWorkflow = readCiWorkflow();
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
    const readme = readReadme();

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
    expect(readme).toContain('https://agentfeed.api.downingmoon.dev/v1');
    expect(readme).toContain('AGENTFEED_ALLOW_INSECURE_API=1');
    expect(readme).toContain('AGENTFEED_API_BASE_URL=http://161.33.171.81:18080/v1');
    expect(readme).toContain('agentfeed completion zsh > _agentfeed');
    expect(readme).toContain('Move the generated file into your shell completion directory');
    expect(readme).not.toContain('Local CLI MVP');
    expect(readme).not.toContain('agentfeed completion bash > ~/.local/share/bash-completion/completions/agentfeed');
  });

  it('documents Windows DPAPI credential storage policy', () => {
    const readme = readReadme();
    const credentialStorageSection = readme.slice(readme.indexOf('### Credential storage policy'));

    expect(credentialStorageSection).toContain('Windows DPAPI');
    expect(credentialStorageSection).toContain('macOS');
    expect(credentialStorageSection).toContain('Linux');
    expect(credentialStorageSection).toContain('does **not** silently downgrade to file storage');
  });
});
