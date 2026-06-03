#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const scriptPath = fileURLToPath(import.meta.url);
const packagePath = join(repoRoot, 'package.json');
const releaseWorkflowPath = join(repoRoot, '.github', 'workflows', 'release.yml');
const PINNED_RELEASE_ACTIONS = {
  'actions/checkout': 'de0fac2e4500dabe0009e67214ff5f5447ce83dd',
  'actions/setup-node': '48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e',
};

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

function includesLine(text, pattern) {
  return pattern.test(text);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function assertPinnedWorkflowAction(workflowText, actionName, expectedSha) {
  const pattern = new RegExp(`uses:\\s*${escapeRegex(actionName)}@([^\\s#]+)`, 'g');
  const matches = Array.from(workflowText.matchAll(pattern));
  assert(matches.length > 0, `release workflow must pin ${actionName} to a 40-character commit SHA.`);
  for (const match of matches) {
    const ref = match[1];
    assert(/^[0-9a-f]{40}$/.test(ref), `release workflow must pin every ${actionName} use to a 40-character commit SHA.`);
    assert(ref === expectedSha, `release workflow must pin ${actionName}@${expectedSha}; update this preflight after intentionally refreshing the upstream action pin.`);
  }
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
  assert(
    Array.isArray(pkg.files) && JSON.stringify(pkg.files) === JSON.stringify(['dist', 'README.md']),
    'package files must be exactly ["dist", "README.md"] so local docs/state never ship in the npm tarball.'
  );
  assert(pkg.scripts?.prepack === 'npm run clean && npm run build && npm run typecheck && npm test -- --run', 'prepack must keep build, typecheck, and test gates.');
  assert(pkg.scripts?.['release:preflight'] === 'npm run prepack && node scripts/release-preflight.mjs', 'release:preflight must run prepack before tarball smoke so local release gates cannot use stale dist.');
  assert(pkg.repository?.type === 'git' && pkg.repository?.url === 'git+https://github.com/downingmoon/agentfeed-cli.git', 'repository metadata must point at the canonical GitHub repo.');
  assert(pkg.homepage === 'https://agentfeed.dev', 'homepage must stay https://agentfeed.dev.');
  assert(pkg.bugs?.url === 'https://github.com/downingmoon/agentfeed-cli/issues', 'bugs URL must point at GitHub issues.');
  assert(pkg.publishConfig?.access === 'public', 'publishConfig.access must be public for the unscoped npm package.');
  assert(pkg.publishConfig?.provenance === true, 'publishConfig.provenance must stay true so npm publish fails closed without provenance support.');
  assert(pkg.private !== true, 'package must not be marked private before npm release.');
}

export function validateTrustedPublishingWorkflow(workflowText) {
  assert(includesLine(workflowText, /^\s*workflow_dispatch:\s*$/m), 'release workflow must support explicit workflow_dispatch releases.');
  assert(includesLine(workflowText, /^\s*tags:\s*$/m) && workflowText.includes("'v*'"), 'release workflow must be limited to v* tag pushes when automatic.');
  assert(includesLine(workflowText, /^\s*contents:\s*read\s*$/m), 'release workflow must grant contents: read.');
  assert(includesLine(workflowText, /^\s*id-token:\s*write\s*$/m), 'release workflow must grant id-token: write for npm OIDC trusted publishing.');
  assert(includesLine(workflowText, /^\s*runs-on:\s*ubuntu-latest\s*$/m), 'release workflow must use a GitHub-hosted ubuntu-latest runner for trusted publishing.');
  for (const [actionName, expectedSha] of Object.entries(PINNED_RELEASE_ACTIONS)) {
    assertPinnedWorkflowAction(workflowText, actionName, expectedSha);
  }
  assert(includesLine(workflowText, /^\s*environment:\s*npm-publish\s*$/m), 'release workflow must use the npm-publish environment for release approval/audit controls.');
  assert(includesLine(workflowText, /^\s*node-version:\s*22\.14\.0\s*$/m), 'release workflow must use Node.js 22.14.0 or newer for npm trusted publishing.');
  assert(includesLine(workflowText, /^\s*registry-url:\s*https:\/\/registry\.npmjs\.org\s*$/m), 'release workflow must publish to the npm registry.');
  assert(workflowText.includes('npm install -g npm@11.6.0'), 'release workflow must install the pinned npm 11.6.0 CLI before publishing.');
  const releaseTagGuardIndex = workflowText.indexOf('Verify release tag matches package version');
  assert(releaseTagGuardIndex !== -1, 'release workflow must verify the matching version tag before installing dependencies or publishing.');
  assert(workflowText.includes('expectedTag = `v${pkg.version}`'), 'release workflow tag guard must derive the expected tag from package.json version.');
  assert(workflowText.includes("refType !== 'tag'") && workflowText.includes('refName !== expectedTag'), 'release workflow tag guard must fail unless the GitHub ref is the matching version tag.');
  const npmInstallIndex = workflowText.indexOf('npm ci');
  const auditIndex = workflowText.indexOf('npm audit --audit-level=high');
  const prepackIndex = workflowText.indexOf('npm run prepack');
  const preflightIndex = workflowText.indexOf('npm run release:preflight');
  const publishIndex = workflowText.indexOf('npm publish --access public');
  assert(npmInstallIndex !== -1, 'release workflow must install dependencies with npm ci.');
  assert(releaseTagGuardIndex < npmInstallIndex, 'release workflow must verify the matching version tag before installing dependencies.');
  assert(auditIndex !== -1, 'release workflow must audit the full dependency graph with npm audit --audit-level=high before prepack and publish.');
  assert(prepackIndex !== -1, 'release workflow must run npm run prepack before release:preflight so release tags execute build, typecheck, and tests directly.');
  assert(preflightIndex !== -1, 'release workflow must run release:preflight before npm publish.');
  assert(releaseTagGuardIndex < auditIndex, 'release workflow must verify the matching version tag before audit/build gates.');
  assert(auditIndex < prepackIndex, 'release workflow must audit the full dependency graph before running package quality gates.');
  assert(prepackIndex < preflightIndex, 'release workflow must run prepack before release:preflight so clean checkout release runs have dist/ available for CLI smoke checks.');
  assert(publishIndex === -1 || releaseTagGuardIndex < publishIndex, 'release workflow must verify the matching version tag before npm publish.');
  assert(publishIndex === -1 || auditIndex < publishIndex, 'release workflow must audit the full dependency graph before npm publish.');
  assert(publishIndex === -1 || prepackIndex < publishIndex, 'release workflow must run prepack before npm publish.');
  assert(publishIndex === -1 || preflightIndex < publishIndex, 'release workflow must run release:preflight before npm publish.');
  assert(!workflowText.includes('npm audit --omit=dev'), 'release workflow audit must include build/dev dependencies because build tools shape the published tarball.');
  assert(!workflowText.includes('--provenance'), 'trusted publishing workflow must not pass --provenance; npm generates provenance automatically through OIDC.');
  assert(includesLine(workflowText, /^\s*-?\s*run:\s*npm publish --access public\s*$/m), 'release workflow must publish the public package with npm publish --access public.');
  assert(!workflowText.includes('NODE_AUTH_TOKEN') && !workflowText.includes('NPM_TOKEN'), 'trusted publishing workflow must not depend on long-lived npm tokens.');
  assert(!includesLine(workflowText, /^\s*cache:\s*npm\s*$/m), 'release workflow must not use dependency caching in release builds.');
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
  for (const forbidden of ['src/', 'tests/', 'scripts/', 'docs/', 'obsidian-vault/', 'AGENTS.md', '.agentfeed/', '.omx/', '.omc/', '.codex/', '.github/', '.env']) {
    assert(!files.some(file => file === forbidden.replace(/\/$/, '') || file.startsWith(forbidden)), `npm tarball must not include ${forbidden}.`);
  }
  for (const file of files) {
    assert(
      file === 'README.md' || file === 'package.json' || file.startsWith('dist/'),
      `npm tarball must contain only built dist files plus README.md/package.json, found ${file}.`
    );
  }
  assert(Number(result.entryCount ?? files.length) >= 1, 'npm dry-run must report at least one packed file.');
  assert(Number(result.unpackedSize ?? 0) > 0, 'npm dry-run must report non-empty unpacked package size.');
}

export function validateCliSmokeOutput(output) {
  assert(output.includes('Usage: agentfeed'), 'built CLI --help output must include the usage banner.');
  assert(output.includes('Version:'), 'built CLI --help output must include the installed package version.');
  assert(output.includes('agentfeed collect'), 'built CLI --help output must include collection guidance.');
}

export function validateCliVersionOutput(output, pkg) {
  assert(output.trim() === pkg.version, 'built CLI --version output must match package.json version exactly.');
}

export function validateInstalledPackageSmokeResult(result, pkg) {
  assert(result?.command === 'agentfeed', 'release preflight must execute the installed agentfeed binary, not only node dist/cli/index.js.');
  validateCliSmokeOutput(result.helpOutput ?? '');
  validateCliVersionOutput(result.versionOutput ?? '', pkg);
}

export function validateReleaseGitRef(pkg, env = process.env) {
  if (env.GITHUB_ACTIONS !== 'true') return;
  const workflowRef = env.GITHUB_WORKFLOW_REF ?? '';
  const isReleaseWorkflow = env.GITHUB_WORKFLOW === 'Release'
    || workflowRef.includes('/.github/workflows/release.yml@');
  if (!isReleaseWorkflow) return;

  const expectedTag = `v${pkg.version}`;
  const ref = env.GITHUB_REF ?? '';
  const inferredTagName = ref.startsWith('refs/tags/') ? ref.slice('refs/tags/'.length) : '';
  const refType = env.GITHUB_REF_TYPE || (inferredTagName ? 'tag' : '');
  const refName = env.GITHUB_REF_NAME || inferredTagName;

  assert(
    refType === 'tag' && refName === expectedTag,
    `release workflow must publish only from the matching version tag ${expectedTag}; got ${refType || 'unknown'} ${refName || ref || 'unknown'}.`
  );
}

export function commandShimExecOptions(platform = process.platform) {
  return platform === 'win32' ? { shell: true } : {};
}

export function npmCommand(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runNpm(args, options) {
  return execFileSync(npmCommand(), args, {
    ...options,
    ...commandShimExecOptions(),
  });
}

function runPackDryRun() {
  const stdout = runNpm(['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  return parsePackJson(stdout);
}

function runPackTarball(destination) {
  const stdout = runNpm(['pack', '--json', '--ignore-scripts', '--pack-destination', destination], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  const packResult = parsePackJson(stdout);
  assert(Array.isArray(packResult) && packResult.length === 1, 'npm pack must return exactly one package tarball for install smoke.');
  const filename = packResult[0]?.filename;
  assert(typeof filename === 'string' && filename.endsWith('.tgz'), 'npm pack must report the generated .tgz filename for install smoke.');
  return {
    packResult,
    tarballPath: join(destination, filename),
  };
}

function comparablePath(path) {
  return resolve(path).replace(/\\/g, '/');
}

export function isDirectInvocation(argvPath = process.argv[1], modulePath = scriptPath) {
  if (!argvPath) return false;
  return comparablePath(argvPath) === comparablePath(modulePath);
}

function runCliSmoke(pkg) {
  const helpOutput = execFileSync(process.execPath, [join(repoRoot, 'dist/cli/index.js'), '--help'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  validateCliSmokeOutput(helpOutput);

  const versionOutput = execFileSync(process.execPath, [join(repoRoot, 'dist/cli/index.js'), '--version'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  validateCliVersionOutput(versionOutput, pkg);
}

export function installedBinPath(installRoot, platform = process.platform) {
  return platform === 'win32'
    ? join(installRoot, 'node_modules', '.bin', 'agentfeed.cmd')
    : join(installRoot, 'node_modules', '.bin', 'agentfeed');
}

export function installedBinExecOptions(platform = process.platform) {
  return commandShimExecOptions(platform);
}

function runInstalledBin(commandPath, args, cwd) {
  return execFileSync(commandPath, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...installedBinExecOptions(),
  });
}

function runInstalledPackageSmoke(pkg) {
  const tmpRoot = mkdtempSync(join(tmpdir(), 'agentfeed-release-preflight-'));
  try {
    const { packResult, tarballPath } = runPackTarball(tmpRoot);
    validatePackResult(packResult, pkg);
    assert(existsSync(tarballPath), 'npm pack must create a tarball before installed CLI smoke.');

    const installRoot = join(tmpRoot, 'install');
    mkdirSync(installRoot, { recursive: true });
    runNpm(['install', '--prefix', installRoot, tarballPath, '--ignore-scripts', '--no-audit', '--no-fund'], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    const commandPath = installedBinPath(installRoot);
    assert(existsSync(commandPath), 'npm install must expose the agentfeed bin in node_modules/.bin.');

    const helpOutput = runInstalledBin(commandPath, ['--help'], installRoot);
    const versionOutput = runInstalledBin(commandPath, ['--version'], installRoot);
    validateInstalledPackageSmokeResult({ command: 'agentfeed', helpOutput, versionOutput }, pkg);
  } finally {
    rmSync(tmpRoot, { recursive: true, force: true });
  }
}

function main() {
  const pkg = readJson(packagePath);
  validatePackageMetadata(pkg);
  validateReleaseGitRef(pkg);
  validateTrustedPublishingWorkflow(readFileSync(releaseWorkflowPath, 'utf8'));
  const packResult = runPackDryRun();
  validatePackResult(packResult, pkg);
  runCliSmoke(pkg);
  runInstalledPackageSmoke(pkg);

  console.log('AgentFeed CLI release preflight passed.');
  console.log(`- Package: ${pkg.name}@${pkg.version}`);
  console.log('- Trusted publishing: release workflow OIDC/toolchain contract validated');
  console.log('- Tarball: npm pack --dry-run --json --ignore-scripts validated');
  console.log('- CLI smoke: built agentfeed --help and --version validated');
  console.log('- Installed package smoke: npm tarball installs and exposes agentfeed --help/--version');
  if (pkg.license === 'UNLICENSED') console.log('- License: UNLICENSED (proprietary/no open-source grant; change only after owner approval).');
  console.log('- Next: configure npm trusted publishing for the Release workflow from a public GitHub repository before production publish.');
}

if (isDirectInvocation()) {
  main();
}
