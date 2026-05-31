import { describe, expect, it } from 'vitest';
import {
  isDirectInvocation,
  parsePackJson,
  validateCliSmokeOutput,
  validatePackageMetadata,
  validatePackResult
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
    'release:preflight': 'node scripts/release-preflight.mjs'
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
    access: 'public'
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
  });

  it('validates npm release metadata contract', () => {
    expect(() => validatePackageMetadata(validPackageJson)).not.toThrow();

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      publishConfig: {
        access: 'restricted'
      }
    })).toThrow('publishConfig.access');

    expect(() => validatePackageMetadata({
      ...validPackageJson,
      private: true
    })).toThrow('must not be marked private');
  });

  it('validates the built CLI help smoke output', () => {
    expect(() => validateCliSmokeOutput('Usage: agentfeed <init|collect>\nagentfeed collect\n')).not.toThrow();
    expect(() => validateCliSmokeOutput('Usage: other')).toThrow('usage banner');
    expect(() => validateCliSmokeOutput('Usage: agentfeed <init|collect>')).toThrow('collection guidance');
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
