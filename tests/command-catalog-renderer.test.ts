import { describe, expect, it } from 'vitest';
import { renderCommandCatalogLines, renderCommandWorkflowLines } from '../src/cli/command-catalog-renderer.js';

describe('command catalog renderer', () => {
  it('renders grouped command catalog lines with injected formatting', () => {
    // Given: command groups and descriptions used by human-readable help.
    const lines = renderCommandCatalogLines({
      groups: [
        { title: 'Start', commands: ['help', 'commands'] },
        { title: 'Share work', commands: ['share'] }
      ],
      descriptions: {
        help: 'Show help',
        commands: 'List commands',
        share: 'Share work'
      },
      section: (value) => `[${value}]`,
      command: (value) => `<${value}>`
    });

    // Then: group headings, padded command names, and descriptions match the CLI catalog shape.
    expect(lines).toEqual([
      '\n[Commands]:',
      '  Start:',
      '    <help      > Show help',
      '    <commands  > List commands',
      '  Share work:',
      '    <share     > Share work'
    ]);
  });

  it('renders guided workflow lines with injected command formatting', () => {
    // Given: workflows shown below the human-readable command catalog.
    const lines = renderCommandWorkflowLines({
      workflows: [
        {
          name: 'Daily share',
          description: 'Preview then upload.',
          commands: ['agentfeed share --dry', 'agentfeed share --yes']
        }
      ],
      section: (value) => `[${value}]`,
      command: (value) => `<${value}>`
    });

    // Then: the section header, workflow summary, and command lines are stable.
    expect(lines).toEqual([
      '\n[Guided workflows]:',
      '  Daily share: Preview then upload.',
      '    <agentfeed share --dry>',
      '    <agentfeed share --yes>'
    ]);
  });
});
