import type { TextFormatter } from './command-catalog-renderer.js';

export type RenderNextCommandLinesInput = {
  readonly commands: readonly string[];
  readonly command: TextFormatter;
};

export function uniqueNextCommands(commands: readonly string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

export function renderNextCommandLines(input: RenderNextCommandLinesInput): string[] {
  return uniqueNextCommands(input.commands).map((command) => `  ${input.command(command)}`);
}

export function renderRecommendedCommandLines(input: RenderNextCommandLinesInput): string[] {
  const unique = uniqueNextCommands(input.commands);
  if (!unique.length) return [];
  return [
    'Recommended order:',
    ...unique.map((command, index) => `  ${index + 1}. ${input.command(command)}`)
  ];
}

export function renderGuidedNextCommandLines(input: RenderNextCommandLinesInput): string[] {
  const unique = uniqueNextCommands(input.commands);
  if (unique.length > 1) {
    return renderRecommendedCommandLines({ commands: unique, command: input.command });
  }
  return renderNextCommandLines({ commands: unique, command: input.command });
}
