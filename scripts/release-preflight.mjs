#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const packagePath = join(repoRoot, 'package.json');

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function isSemver(version) {
  return /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version);
}

function normalizeTarballPath(path) {
  return path.replace(/^package\//, '');
}

export function parsePackJson(raw) {
  const text = raw.trim();
  try {
    return JSON.parse(text);
  } catch {
    for (let index = text.lastIndexOf('['); index >= 0; index = text.lastIndexOf('[', index - 1)) {
      const candidate = text.slice(index).trim();
      try {
        return JSON.parse(candidate);
      } catch {
        // npm prints lifecycle output before the JSON array; keep scanning for
        // the final parseable array instead of assuming the JSON starts first.
      }
    }
    throw new Error('npm pack --dry-run --json did not produce parseable JSON output.');
  }
}

export function validatePackageMetadata(pkg) {
  assert(pkg.name === 'agentfeed-cli', 'package name must stay agentfeed-cli.');
  assert(isSemver(pkg.version), 'package version must be valid semver.');
  assert(pkg.description && pkg.description.includes('AgentFeed CLI'), 'package description must describe the AgentFeed CLI.');
  assert(typeof pkg.license === 'string' && pkg.license.trim(), 'package must declare license terms before release; use UNLICENSED for proprietary distribution or an SPDX license after owner approval.');
  assert(pkg.engines?.node === '>=20', 'package engines.node must stay >=20.');
  assert(pkg.packageManager?.startsWith('npm@'), 'packageManager must pin npm for reproducible release commands.');
  assert(pkg.bin?.agentfeed === './dist/cli/index.js', 'agentfeed bin must point at ./dist/cli/index.js.');
  assert(Array.isArray(pkg.files) && pkg.files.includes('dist') && pkg.files.includes('README.md'), 'package files must include dist and README.md.');
  assert(pkg.scripts?.prepack === 'npm run clean && npm run build && npm run typecheck && npm test -- --run', 'prepack must keep build, typecheck, and test gates.');
  assert(pkg.scripts?.['release:preflight'] === 'node scripts/release-preflight.mjs', 'package.json must expose npm run release:preflight.');
  assert(pkg.repository?.type === 'git' && pkg.repository?.url === 'git+https://github.com/downingmoon/agentfeed-cli.git', 'repository metadata must point at the canonical GitHub repo.');
  assert(pkg.homepage === 'https://agentfeed.dev', 'homepage must stay https://agentfeed.dev.');
  assert(pkg.bugs?.url === 'https://github.com/downingmoon/agentfeed-cli/issues', 'bugs URL must point at GitHub issues.');
  assert(pkg.publishConfig?.access === 'public', 'publishConfig.access must be public for the unscoped npm package.');
  assert(pkg.private !== true, 'package must not be marked private before npm release.');
}

export function validatePackResult(packResult, pkg) {
  assert(Array.isArray(packResult) && packResult.length === 1, 'npm pack dry-run must return exactly one package result.');
  const result = packResult[0];
  assert(result.name === pkg.name, 'packed tarball name must match package.json.');
  assert(result.version === pkg.version, 'packed tarball version must match package.json.');
  const files = (result.files ?? []).map(file => normalizeTarballPath(file.path ?? '')).filter(Boolean);
  const fileSet = new Set(files);
  assert(fileSet.has('README.md'), 'npm tarball must include README.md.');
  assert(fileSet.has('package.json'), 'npm tarball must include package.json.');
  assert(fileSet.has('dist/cli/index.js'), 'npm tarball must include built CLI entrypoint.');
  assert(fileSet.has('dist/version.js'), 'npm tarball must include built version metadata at dist/version.js.');
  for (const forbidden of ['src/', 'tests/', 'scripts/', '.agentfeed/', '.omx/', '.omc/', '.env']) {
    assert(!files.some(file => file === forbidden.replace(/\/$/, '') || file.startsWith(forbidden)), `npm tarball must not include ${forbidden}.`);
  }
  assert(Number(result.entryCount ?? files.length) >= 1, 'npm dry-run must report at least one packed file.');
  assert(Number(result.unpackedSize ?? 0) > 0, 'npm dry-run must report non-empty unpacked package size.');
}

function runPackDryRun() {
  const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return parsePackJson(stdout);
}

function comparablePath(path) {
  return resolve(path).replace(/\\/g, '/');
}

export function isDirectInvocation(argvPath = process.argv[1], modulePath = scriptPath) {
  if (!argvPath) return false;
  return comparablePath(argvPath) === comparablePath(modulePath);
}

function main() {
  const pkg = readJson(packagePath);
  validatePackageMetadata(pkg);
  const packResult = runPackDryRun();
  validatePackResult(packResult, pkg);

  console.log('AgentFeed CLI release preflight passed.');
  console.log(`- Package: ${pkg.name}@${pkg.version}`);
  console.log('- Tarball: npm pack --dry-run --json validated');
  if (pkg.license === 'UNLICENSED') console.log('- License: UNLICENSED (proprietary/no open-source grant; change only after owner approval).');
  console.log('- Next: publish from a public GitHub repository with npm provenance/trusted publishing, or document that manual local publish will not include provenance.');
}

if (isDirectInvocation()) {
  main();
}
