import { describe, expect, it } from 'vitest';
import {
  commandShimExecOptions,
  installedBinExecOptions,
  installedBinPath,
  npmCommand,
  isDirectInvocation,
  validateCliSmokeOutput,
  validateCliVersionOutput,
  validateInstalledPackageSmokeResult,
  validateInstalledPackageWorkflowSmokeResult
} from '../scripts/release-preflight.mjs';

const validPackageJson = {
  name: 'agentfeed-cli',
  version: '0.2.0'
};

describe('release installed package smoke preflight guardrails', () => {
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
