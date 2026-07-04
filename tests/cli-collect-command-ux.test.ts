import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { useCollectCommandUxFixture } from './cli-collect-command-ux-helpers.js';

const fixture = useCollectCommandUxFixture();

describe('collect command UX and validation', () => {
  it('prints polished human-readable explain output with draft summary and next-step sections', async () => {
    await fixture.writeSource('export const ok = "human-explain";\n');

    const { stdout, stderr } = await fixture.runCollect([
      '--explain',
      '--all',
      '--no-save-cursor'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('AgentFeed draft');
    expect(stdout).toContain('Summary');
    expect(stdout).toContain('Next');
    expect(stdout).toContain('ID:');
    expect(stdout).toContain('Title:');
    expect(stdout).toContain('Signals');
    expect(stdout).toContain('Agent:');
    expect(stdout).toContain('Metrics:');
    expect(stdout).toContain('Collection');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('  1. agentfeed preview --id');
    expect(stdout).toContain('  2. agentfeed publish --id');
  });

  it('prints subcommand help without collecting or updating local state', async () => {
    const { stdout, stderr } = await fixture.runCollect(['--help']);

    expect(stdout).toContain('Usage: agentfeed collect');
    expect(stdout).toContain('--source <source>');
    expect(stdout).toContain('--session-file <path>');
    expect(stdout).toContain('--dry, --dry-run');
    expect(stdout).toContain('agentfeed collect --dry-run --explain');
    expect(stdout).not.toContain('Usage: agentfeed <command>');
    expect(stdout).not.toContain('agentfeed login --token-stdin');
    expect(stderr).toBe('');
    await fixture.expectDraftsEmpty();
    await fixture.expectStateFileMissing();
  });

  it('accepts collect dry-run as an explicit local-only alias', async () => {
    await fixture.writeSource('export const ok = "collect-dry-run";\n');

    const { stdout, stderr } = await fixture.runCollect([
      '--dry-run',
      '--explain',
      '--all',
      '--no-save-cursor'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('Mode: dry run (local draft only; no upload attempted)');
    expect(stdout).toContain('Collection quality');
    expect(stdout).toContain('Recommended order:');
    expect(stdout).toContain('agentfeed publish --id');
  });

  it('collects Antigravity transcripts through the public antigravity-cli source', async () => {
    const dir = fixture.dir();
    const sessionFile = join(dir, 'antigravity-cli-public-source.jsonl');
    await fixture.writeProjectFile('antigravity-cli-public-source.jsonl', [
      JSON.stringify({ step_index: 0, source: 'USER_EXPLICIT', type: 'USER_INPUT', status: 'DONE', created_at: '2026-06-25T03:56:15Z', content: '<USER_REQUEST>Update API</USER_REQUEST>' }),
      JSON.stringify({ step_index: 1, source: 'MODEL', type: 'PLANNER_RESPONSE', status: 'DONE', created_at: '2026-06-25T03:56:20Z', tokens: { input: 100, cached: 20, output: 30, thoughts: 5, tool: 7 }, tool_calls: [
        { name: 'run_command', args: { CommandLine: '"git status --short"', Cwd: JSON.stringify(dir) } }
      ] }),
      JSON.stringify({ step_index: 2, source: 'MODEL', type: 'RUN_COMMAND', status: 'DONE', created_at: '2026-06-25T03:56:21Z', content: 'Created At: 2026-06-25T03:56:21Z\nCompleted At: 2026-06-25T03:56:22Z\nThe command completed successfully.\nOutput:\n?? src/agy-created.ts\n M src/api.ts\n' }),
      JSON.stringify({ step_index: 3, source: 'MODEL', type: 'CODE_ACTION', status: 'DONE', created_at: '2026-06-25T03:56:23Z', content: `Created file file://${join(dir, 'src', 'agy-created.ts')} with requested content.` })
    ].join('\n') + '\n');

    const { stdout, stderr } = await fixture.runCollect([
      '--source',
      'antigravity-cli',
      '--session-file',
      sessionFile,
      '--all',
      '--force',
      '--dry-run',
      '--json',
      '--no-save-cursor'
    ]);

    expect(stderr).toBe('');
    expect(stdout).toContain('"agent": "gemini_cli"');
    expect(stdout).toContain('"session_id": "antigravity-cli-public-source"');
    expect(stdout).toContain('"tokens_used": 162');
    expect(stdout).toContain('"duration_seconds": 8');
    expect(stdout).toContain('"files_changed": 2');
    expect(stdout).toContain('"commands_run": 1');
    expect(stdout).toContain('"tool_calls": 2');
    expect(stdout).toContain('"name": "antigravity_cli"');
  });

  it('rejects contradictory collect dry-run upload flags before creating a draft', async () => {
    const failure = await fixture.runCollectExpectingFailure(['--dry-run', '--upload']);

    expect(failure.stderr ?? '').toContain('Conflicting options for collect: --dry-run and --upload');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --help');
  });

  it('rejects unsupported source values before creating a draft', async () => {
    const failure = await fixture.runCollectExpectingFailure([
      '--source',
      'gemni-cli',
      '--no-save-cursor'
    ]);

    expect(failure.stderr ?? '').toContain('Unsupported agent source: gemni-cli');
    expect(failure.stderr ?? '').toContain('Supported sources: claude-code, codex, cursor, gemini-cli, antigravity-cli, other');
    expect(failure.stderr ?? '').toContain('Tip: omit --source to let AgentFeed auto-detect Claude/Codex/Cursor/Gemini/Antigravity sessions.');
    expect(failure.stderr ?? '').toContain('Did you mean: --source gemini-cli');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --explain');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --source gemini-cli --explain');
    expect(failure.stderr ?? '').toContain('Run: agentfeed collect --help');
  });
});
