import { describe, expect, it } from 'vitest';
import { validateTrustedPublishingWorkflow } from '../scripts/release-preflight.mjs';

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


describe('release trusted publishing workflow preflight guardrails', () => {
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
});
