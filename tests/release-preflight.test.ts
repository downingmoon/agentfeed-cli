import { describe, expect, it } from 'vitest';
import {
  parsePackJson,
  validatePackageMetadata,
  validatePackResult,
  validateReleaseGitRef
} from '../scripts/release-preflight.mjs';

import { validPackageJson, validPackResult } from './release-preflight-helpers.js';

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
