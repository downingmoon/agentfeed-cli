import { readFileSync } from 'node:fs';

export const validPackageJson = {
  name: 'agentfeed-cli',
  version: '0.2.0',
  description: 'AgentFeed CLI for publishing safe AI worklogs',
  license: 'MIT',
  engines: {
    node: '>=20'
  },
  packageManager: 'npm@11.6.0',
  bin: {
    agentfeed: './dist/cli/index.js'
  },
  files: ['dist', 'README.md', 'LICENSE'],
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

export const validPackResult = [{
  name: 'agentfeed-cli',
  version: '0.2.0',
  files: [
    { path: 'package/README.md' },
    { path: 'package/LICENSE' },
    { path: 'package/package.json' },
    { path: 'package/dist/cli/index.js' },
    { path: 'package/dist/version.js' }
  ],
  entryCount: 5,
  unpackedSize: 1234
}];

export function readCiWorkflow(): string {
  return readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');
}

export function readReadme(): string {
  return readFileSync(new URL('../README.md', import.meta.url), 'utf8');
}
