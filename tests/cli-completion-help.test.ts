import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');
const execFileAsync = promisify(execFile);

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-completion-help-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

async function runCli(args: readonly string[]): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, [cliPath, ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '', AGENTFEED_CI: '1' }
  });
}

describe('CLI completion help', () => {
  it('prints completion-specific help for completion --help', async () => {
    const { stdout, stderr } = await runCli(['completion', '--help']);

    expect(stdout).toContain('Usage: agentfeed completion <shell>');
    expect(stdout).toContain('zsh');
    expect(stdout).toContain('bash');
    expect(stdout).toContain('fish');
    expect(stdout).toContain('Install:');
    expect(stdout).toContain('agentfeed completion zsh > _agentfeed');
    expect(stdout).toContain('agentfeed completion bash > agentfeed.bash');
    expect(stdout).toContain('agentfeed completion fish > agentfeed.fish');
    expect(stdout).toContain('Move the generated file into your shell completion directory.');
    expect(stdout).toContain('Restart your shell after installing completions.');
    expect(stderr).toBe('');
  });

  it('prints a zsh completion script for completion zsh', async () => {
    const { stdout, stderr } = await runCli(['completion', 'zsh']);

    expect(stdout).toContain('#compdef agentfeed');
    expect(stdout).toContain('_agentfeed');
    expect(stdout).toContain('agentfeed');
    expect(stdout).toContain('completion) compadd -- zsh bash fish --help');
    expect(stdout).toContain('help) compadd -- help commands init login');
    expect(stdout).toContain('completion token --help');
    expect(stdout).toContain('_arguments');
    expect(stdout).toContain("'--json[Print machine-readable login status]'");
    expect(stdout).toContain("'--api-base-url[Override AgentFeed API base URL]:API URL:'");
    expect(stdout).toContain("'--source[Select agent source]:source:(claude-code codex cursor gemini-cli antigravity-cli other)'");
    expect(stdout).toContain("'--session-file[Read agent session metadata from a file]:path:_files'");
    expect(stdout).not.toContain('_arguments \\n');
    expect(stdout).not.toContain('Option for agentfeed');
    expect(stderr).toBe('');
  });

  it('prints a bash completion script for completion bash', async () => {
    const { stdout, stderr } = await runCli(['completion', 'bash']);

    expect(stdout).toContain('_agentfeed()');
    expect(stdout).toContain('complete -F _agentfeed agentfeed');
    expect(stdout).toContain('completion) options="zsh bash fish --help"');
    expect(stdout).toContain('--source) COMPREPLY=( $(compgen -W "claude-code codex cursor gemini-cli antigravity-cli other" -- "$cur") ); return 0 ;;');
    expect(stdout).toContain('--path|--session-file|--settings-path) COMPREPLY=( $(compgen -f -- "$cur") ); return 0 ;;');
    expect(stdout).toContain('help) options="help commands init login');
    expect(stdout).toContain('completion token --help"');
    expect(stderr).toBe('');
  });

  it('prints a fish completion script for completion fish', async () => {
    const { stdout, stderr } = await runCli(['completion', 'fish']);

    expect(stdout).toContain('complete -c agentfeed');
    expect(stdout).toContain('completion');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from completion" -a "zsh bash fish"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from help" -a "help commands init login');
    expect(stdout).toContain('completion token" -d "Help topic"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from login" -l json -d "Print machine-readable login status"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from login" -l api-base-url -r -d "Override AgentFeed API base URL"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from collect" -l source -r -a "claude-code codex cursor gemini-cli antigravity-cli other" -d "Select agent source"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from share" -l session-file -r -F -d "Read agent session metadata from a file"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from share" -l note -r -d "Attach a public-safe author note"');
    expect(stdout).toContain('complete -c agentfeed -n "__fish_seen_subcommand_from publish" -s y -d "Upload without an interactive confirmation"');
    expect(stdout).not.toContain('Option for agentfeed');
    expect(stderr).toBe('');
  });});
