import { describe, expect, it } from 'vitest';
import { renderGuidedNextCommandLines, renderNextCommandLines, uniqueNextCommands } from '../src/cli/guided-next-command-renderer.js';

describe('guided next command renderer', () => {
  it('deduplicates commands while preserving first-seen order', () => {
    // Given: repeated next actions from multiple readiness checks.
    const commands = ['agentfeed status', 'agentfeed share --dry', 'agentfeed status'];

    // When / Then: only the duplicate is removed and command order remains stable.
    expect(uniqueNextCommands(commands)).toEqual(['agentfeed status', 'agentfeed share --dry']);
  });

  it('renders a single next command without a recommended-order heading', () => {
    // Given: one next action and an injected command formatter.
    const lines = renderNextCommandLines({
      commands: ['agentfeed status'],
      command: (value) => `<${value}>`
    });

    // Then: the single-action shape matches existing CLI next sections.
    expect(lines).toEqual(['  <agentfeed status>']);
  });

  it('renders multiple next commands as a recommended order', () => {
    // Given: multiple next actions with one duplicate.
    const lines = renderGuidedNextCommandLines({
      commands: ['agentfeed init', 'agentfeed login', 'agentfeed init'],
      command: (value) => `<${value}>`
    });

    // Then: the guided shape includes numbering after deduplication.
    expect(lines).toEqual([
      'Recommended order:',
      '  1. <agentfeed init>',
      '  2. <agentfeed login>'
    ]);
  });
});
