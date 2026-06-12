import { describe, expect, it } from 'vitest';
import {
  CI_ENVIRONMENT_VARIABLES,
  isCiEnvironment,
  isTruthyEnvironmentValue,
  shouldOpenReviewAfterUpload,
  shouldRequireUploadConfirmation
} from '../src/cli/runtime-policy.js';
import { defaultProjectConfig } from '../src/config/defaults.js';
import type { AgentFeedProjectConfig } from '../src/types.js';

function projectConfig(openReviewAfterUpload: boolean): AgentFeedProjectConfig {
  const config = defaultProjectConfig({ name: 'Runtime Policy', slug: 'runtime-policy' });
  return {
    ...config,
    collection: {
      ...config.collection,
      open_review_after_upload: openReviewAfterUpload
    }
  };
}

describe('CLI runtime policy', () => {
  it('treats common CI environment values as truthy only when explicitly enabled', () => {
    expect(isTruthyEnvironmentValue(undefined)).toBe(false);
    expect(isTruthyEnvironmentValue('')).toBe(false);
    expect(isTruthyEnvironmentValue('0')).toBe(false);
    expect(isTruthyEnvironmentValue('false')).toBe(false);
    expect(isTruthyEnvironmentValue('FALSE')).toBe(false);
    expect(isTruthyEnvironmentValue('1')).toBe(true);
    expect(isTruthyEnvironmentValue('true')).toBe(true);
    expect(isTruthyEnvironmentValue('yes')).toBe(true);
  });

  it('detects CI when any supported CI environment variable is truthy', () => {
    for (const name of CI_ENVIRONMENT_VARIABLES) {
      expect(isCiEnvironment({ [name]: '1' })).toBe(true);
      expect(isCiEnvironment({ [name]: '0' })).toBe(false);
    }
  });

  it('keeps upload confirmation required unless JSON output or explicit yes is requested', () => {
    expect(shouldRequireUploadConfirmation({})).toBe(true);
    expect(shouldRequireUploadConfirmation({ yes: true })).toBe(false);
    expect(shouldRequireUploadConfirmation({ json: true })).toBe(false);
    expect(shouldRequireUploadConfirmation({ json: true, yes: true })).toBe(false);
  });

  it('resolves review auto-open policy from flags before config or CI', async () => {
    const loadProjectConfig = async () => projectConfig(false);

    await expect(shouldOpenReviewAfterUpload(true, {
      env: { CI: '1' },
      loadProjectConfig
    })).resolves.toBe(true);
    await expect(shouldOpenReviewAfterUpload(true, {
      noOpen: true,
      env: { CI: '0' },
      loadProjectConfig
    })).resolves.toBe(false);
    await expect(shouldOpenReviewAfterUpload(false, {
      respectConfig: false,
      env: { CI: '0' },
      loadProjectConfig
    })).resolves.toBe(false);
  });

  it('suppresses configured review auto-open in CI unless explicitly requested', async () => {
    await expect(shouldOpenReviewAfterUpload(false, {
      env: { CI: '1' },
      loadProjectConfig: async () => projectConfig(true)
    })).resolves.toBe(false);
  });

  it('uses project config when review auto-open is not suppressed by flags or CI', async () => {
    await expect(shouldOpenReviewAfterUpload(false, {
      env: { CI: '0', AGENTFEED_CI: '0', GITHUB_ACTIONS: '0' },
      loadProjectConfig: async () => projectConfig(true)
    })).resolves.toBe(true);
    await expect(shouldOpenReviewAfterUpload(false, {
      env: { CI: '0' },
      loadProjectConfig: async () => projectConfig(false)
    })).resolves.toBe(false);
  });

  it('fails closed when project config cannot be loaded', async () => {
    await expect(shouldOpenReviewAfterUpload(false, {
      env: { CI: '0' },
      loadProjectConfig: async () => {
        throw new Error('missing project config');
      }
    })).resolves.toBe(false);
  });
});
