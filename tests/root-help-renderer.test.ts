import { describe, expect, it } from 'vitest';
import { renderRootHelpLines } from '../src/cli/root-help-renderer.js';

describe('root help renderer', () => {
  it('renders root help sections around the injected command catalog', () => {
    // Given: root help copy, display formatters, and pre-rendered catalog lines.
    const lines = renderRootHelpLines({
      version: '9.9.9',
      heading: (value) => `[${value}]`,
      section: (value) => `{${value}}`,
      command: (value) => `<${value}>`,
      commandCatalogLines: ['\n{Commands}:', '  Start:', '    <help      > Show help']
    });

    // Then: the static sections, injected catalog, and final command-specific guidance stay ordered.
    expect(lines).toEqual([
      '[Usage: agentfeed <command> [options]]',
      'Version: 9.9.9',
      '\n{Global options}:\n  agentfeed --help\n  agentfeed --version\n  agentfeed -v\n  agentfeed version',
      '\n{Help}:\n  agentfeed help\n  agentfeed commands\n  agentfeed help <command>\n  agentfeed <command> help',
      '\n{Quickstart}:\n  agentfeed init\n  agentfeed login\n  agentfeed share --dry\n  agentfeed share --yes --open-review',
      '\n{Headless login}:\n  printf %s "$TOKEN" | agentfeed login --token-stdin\n  printf %s "$TOKEN" | agentfeed login --token - --no-save',
      '\n{Daily workflow}:\n  agentfeed share\n  agentfeed share --yes\n  agentfeed share --dry\n  agentfeed share --note "Fixed auth flow"\n  agentfeed status',
      '\n{Draft review}:\n  agentfeed collect --explain\n  agentfeed preview --latest\n  agentfeed publish --latest --yes\n  agentfeed open --latest',
      '\n{Advanced and diagnostics}:\n  agentfeed doctor\n  agentfeed scan --id <draft_id> --dry-run\n  agentfeed drafts\n  agentfeed discard --id <draft_id>\n  agentfeed rotate\n  agentfeed logout',
      '\n{Shell completion}:\n  agentfeed completion zsh\n  agentfeed completion bash\n  agentfeed completion fish',
      '\n{Commands}:',
      '  Start:',
      '    <help      > Show help',
      '\nRun <agentfeed <command> --help> for command-specific options.'
    ]);
  });
});
