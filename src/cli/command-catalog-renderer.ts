export type TextFormatter = (value: string) => string;

export type RenderCommandCatalogGroup = {
  readonly title: string;
  readonly commands: readonly string[];
};

export type RenderCommandCatalogInput = {
  readonly groups: readonly RenderCommandCatalogGroup[];
  readonly descriptions: Readonly<Record<string, string>>;
  readonly section: TextFormatter;
  readonly command: TextFormatter;
};

export type RenderCommandWorkflow = {
  readonly name: string;
  readonly description: string;
  readonly commands: readonly string[];
};

export const COMMAND_WORKFLOWS: readonly RenderCommandWorkflow[] = [
  {
    name: 'Beginner setup',
    description: 'Connect one project and confirm the CLI is ready.',
    commands: ['agentfeed init', 'agentfeed login', 'agentfeed status']
  },
  {
    name: 'Daily share',
    description: 'Preview work first, then upload and open the private review.',
    commands: ['agentfeed share --dry', 'agentfeed share --yes --open-review']
  },
  {
    name: 'Draft review',
    description: 'Inspect pending drafts and publish the one you trust.',
    commands: ['agentfeed drafts', 'agentfeed preview --latest', 'agentfeed publish --latest --yes']
  },
  {
    name: 'Power user',
    description: 'Control source, window, and evidence before publishing.',
    commands: ['agentfeed collect --explain', 'agentfeed collect --source codex --all', 'agentfeed publish --latest --yes']
  },
  {
    name: 'Recovery',
    description: 'Diagnose setup, token, API, or agent-detection problems.',
    commands: ['agentfeed doctor', 'agentfeed status', 'agentfeed share --dry']
  }
];

export type RenderCommandWorkflowInput = {
  readonly workflows: readonly RenderCommandWorkflow[];
  readonly section: TextFormatter;
  readonly command: TextFormatter;
};

export function renderCommandCatalogLines(input: RenderCommandCatalogInput): string[] {
  return [
    `\n${input.section('Commands')}:`,
    ...input.groups.flatMap((group) => [
      `  ${group.title}:`,
      ...group.commands.map((commandName) => `    ${input.command(commandName.padEnd(10))} ${input.descriptions[commandName] ?? ''}`)
    ])
  ];
}

export function renderCommandWorkflowLines(input: RenderCommandWorkflowInput): string[] {
  return [
    `\n${input.section('Guided workflows')}:`,
    ...input.workflows.flatMap((workflow) => [
      `  ${workflow.name}: ${workflow.description}`,
      ...workflow.commands.map((commandName) => `    ${input.command(commandName)}`)
    ])
  ];
}
