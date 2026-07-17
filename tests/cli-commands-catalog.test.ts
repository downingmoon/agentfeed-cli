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
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-cli-commands-catalog-'));
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

interface CommandCatalogJson {
  readonly next_actions?: readonly string[];
  readonly workflows?: readonly CommandWorkflow[];
  readonly commands: readonly CommandGroup[];
}

interface CommandWorkflow {
  readonly name: string;
  readonly description: string;
  readonly commands: readonly string[];
}

interface CommandGroup {
  readonly group: string;
  readonly commands: readonly CommandEntry[];
}

interface CommandEntry {
  readonly name: string;
  readonly description: string;
  readonly usage?: string;
  readonly help_command?: string;
  readonly example_command?: string;
  readonly options?: CommandOptions;
}

interface CommandOptions {
  readonly flags?: readonly string[];
  readonly value_options?: readonly string[];
  readonly option_details?: readonly CommandOptionDetail[];
  readonly conflicts?: readonly (readonly [string, string])[];
  readonly completion_words?: readonly string[];
}

interface CommandOptionDetail {
  readonly name: string;
  readonly description: string;
  readonly requires_value: boolean;
  readonly value_hint?: string;
  readonly value_choices?: readonly string[];
}

describe('CLI commands catalog help', () => {
  it('prints command catalog through commands command and JSON output', async () => {
    const human = await runCli(['commands']);
    expect(human.stderr).toBe('');
    expect(human.stdout).toContain('AgentFeed commands');
    expect(human.stdout).toContain('Start:');
    expect(human.stdout).toContain('commands');
    expect(human.stdout).toContain('List available AgentFeed commands');
    expect(human.stdout).toContain('Guided workflows:');
    expect(human.stdout).toContain('Beginner setup: Connect one project and confirm the CLI is ready.');
    expect(human.stdout).toContain('agentfeed init');
    expect(human.stdout).toContain('Daily share:');
    expect(human.stdout).toContain('agentfeed share --yes --open-review');
    expect(human.stdout).toContain('agentfeed share');
    expect(human.stdout).toContain('Draft review: Inspect pending drafts and publish the one you trust.');
    expect(human.stdout).toContain('Power user: Control source, window, and evidence before publishing.');
    expect(human.stdout).toContain('Recovery: Diagnose setup, token, API, or agent-detection problems.');
    expect(human.stdout).toContain('Try this:');
    expect(human.stdout).toContain('Recommended order:');
    expect(human.stdout).toContain('  1. agentfeed init');
    expect(human.stdout).toContain('  2. agentfeed login');
    expect(human.stdout).toContain('agentfeed share --dry');
    expect(human.stdout).toContain('Run agentfeed help <command>');

    const json = await runCli(['commands', '--json']);
    const parsed: CommandCatalogJson = JSON.parse(json.stdout);
    const flatCommands = parsed.commands.flatMap((group) => group.commands);
    const share = flatCommands.find((command) => command.name === 'share');
    const commands = flatCommands.find((command) => command.name === 'commands');
    const completion = flatCommands.find((command) => command.name === 'completion');

    expect(json.stderr).toBe('');
    expect(parsed.next_actions).toEqual(['agentfeed init', 'agentfeed login', 'agentfeed share --dry']);
    expect(parsed.workflows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Beginner setup', description: 'Connect one project and confirm the CLI is ready.', commands: ['agentfeed init', 'agentfeed login', 'agentfeed status'] }),
      expect.objectContaining({ name: 'Daily share', description: 'Preview work first, then confirm or automate the private review upload.', commands: expect.arrayContaining(['agentfeed share --dry', 'agentfeed share', 'agentfeed share --yes --open-review']) }),
      expect.objectContaining({ name: 'Power user', commands: expect.arrayContaining(['agentfeed collect --upload']) }),
      expect.objectContaining({ name: 'Recovery', commands: expect.arrayContaining(['agentfeed doctor', 'agentfeed status']) })
    ]));
    expect(parsed.commands.some((group) => group.group === 'Start')).toBe(true);
    expect(share).toMatchObject({
      description: 'Collect, preview, and optionally upload in one workflow',
      usage: 'agentfeed share [options]',
      help_command: 'agentfeed help share',
      example_command: 'agentfeed share --dry'
    });
    expect(share?.options).toMatchObject({
      flags: expect.arrayContaining(['--dry', '--yes', '--json', '--clipboard', '--open-review', '--no-save-cursor']),
      value_options: expect.arrayContaining(['--source', '--session-file', '--note']),
      option_details: expect.arrayContaining([
        expect.objectContaining({ name: '--source', description: 'Select agent source', requires_value: true, value_hint: 'source', value_choices: ['claude-code', 'codex', 'cursor', 'antigravity-cli', 'other'] }),
        expect.objectContaining({ name: '--no-save-cursor', description: 'Do not advance the collection cursor', requires_value: false })
      ]),
      conflicts: expect.arrayContaining([['--dry', '--yes'], ['--clipboard', '--no-clipboard']]),
      completion_words: expect.arrayContaining(['--dry', '--json', '--note', '--source', '--help'])
    });
    expect(commands).toMatchObject({
      help_command: 'agentfeed help commands',
      example_command: 'agentfeed commands'
    });
    expect(commands?.options).toMatchObject({
      flags: ['--json'],
      value_options: [],
      conflicts: [],
      completion_words: ['--help', '--json']
    });
    expect(completion).toMatchObject({
      usage: 'agentfeed completion <shell>',
      options: {
        completion_words: expect.arrayContaining(['zsh', 'bash', 'fish', '--help'])
      }
    });
    expect(json.stdout).not.toMatch(/^AgentFeed commands$/m);
    expect(json.stdout).not.toMatch(/(^|\n)Run agentfeed help/);
  });
});
