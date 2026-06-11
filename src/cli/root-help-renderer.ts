import type { TextFormatter } from './command-catalog-renderer.js';

export type RenderRootHelpInput = {
  readonly version: string;
  readonly heading: TextFormatter;
  readonly section: TextFormatter;
  readonly command: TextFormatter;
  readonly commandCatalogLines: readonly string[];
};

export function renderRootHelpLines(input: RenderRootHelpInput): string[] {
  return [
    input.heading('Usage: agentfeed <command> [options]'),
    `Version: ${input.version}`,
    `\n${input.section('Global options')}:\n  agentfeed --help\n  agentfeed --version\n  agentfeed -v\n  agentfeed version`,
    `\n${input.section('Help')}:\n  agentfeed help\n  agentfeed commands\n  agentfeed help <command>\n  agentfeed <command> help`,
    `\n${input.section('Quickstart')}:\n  agentfeed init\n  agentfeed login\n  agentfeed share --dry\n  agentfeed share --yes --open-review`,
    `\n${input.section('Headless login')}:\n  printf %s "$TOKEN" | agentfeed login --token-stdin\n  printf %s "$TOKEN" | agentfeed login --token - --no-save`,
    `\n${input.section('Daily workflow')}:\n  agentfeed share\n  agentfeed share --yes\n  agentfeed share --dry\n  agentfeed share --note "Fixed auth flow"\n  agentfeed status`,
    `\n${input.section('Draft review')}:\n  agentfeed collect --explain\n  agentfeed preview --latest\n  agentfeed publish --latest --yes\n  agentfeed open --latest`,
    `\n${input.section('Advanced and diagnostics')}:\n  agentfeed doctor\n  agentfeed scan --id <draft_id> --dry-run\n  agentfeed hook install claude-code\n  agentfeed drafts\n  agentfeed discard --id <draft_id>\n  agentfeed rotate\n  agentfeed logout`,
    `\n${input.section('Shell completion')}:\n  agentfeed completion zsh\n  agentfeed completion bash\n  agentfeed completion fish`,
    ...input.commandCatalogLines,
    `\nRun ${input.command('agentfeed <command> --help')} for command-specific options.`
  ];
}
