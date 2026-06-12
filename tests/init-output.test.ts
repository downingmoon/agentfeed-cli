import { describe, expect, it } from 'vitest';
import { initJsonPayload, initSetupChecklist, renderInitHumanLines } from '../src/cli/init-output.js';

const initializedInput = {
  alreadyInitialized: false,
  project: {
    name: 'setup-polish',
    visibility: 'private',
    tags: []
  },
  root: '/tmp/agentfeed-init',
  backupPaths: []
} as const;

const forcedInput = {
  alreadyInitialized: false,
  project: {
    name: 'forced-setup',
    visibility: 'private',
    tags: ['cli']
  },
  root: '/tmp/agentfeed-init',
  backupPaths: [
    '/tmp/agentfeed-init/.agentfeed/backups/config.20260612.json',
    '/tmp/agentfeed-init/.agentfeed/backups/redaction-rules.20260612.json'
  ]
} as const;

describe('init output helpers', () => {
  it('builds init JSON payload with setup checklist and relative backup paths', () => {
    // Given: a forced init result with absolute backup paths.
    const payload = initJsonPayload(forcedInput);

    // Then: the machine-readable contract keeps project fields and relative backup paths.
    expect(payload).toMatchObject({
      already_initialized: false,
      project: { name: 'forced-setup', visibility: 'private', tags: ['cli'] },
      root: '/tmp/agentfeed-init',
      config_path: '.agentfeed/config.json',
      backup_paths: [
        '.agentfeed/backups/config.20260612.json',
        '.agentfeed/backups/redaction-rules.20260612.json'
      ],
      next_actions: ['agentfeed login', 'agentfeed hook install claude-code', 'agentfeed share --dry']
    });
    expect(payload.setup_checklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Project', detail: 'config ready' }),
      expect.objectContaining({ name: 'Account', next_action: 'agentfeed login' }),
      expect.objectContaining({ name: 'First draft', next_action: 'agentfeed share --dry' })
    ]));
  });

  it('renders initialized and already-initialized human output with setup checklist and next actions', () => {
    // Given: initialized and already-initialized init outcomes.
    const initialized = renderInitHumanLines(initializedInput, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    }).join('\n');
    const already = renderInitHumanLines({ ...initializedInput, alreadyInitialized: true }, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    }).join('\n');

    // Then: each report preserves its state-specific heading, summary, checklist, and next actions.
    expect(initialized).toContain('AgentFeed initialized');
    expect(initialized).toContain('Project config created.');
    expect(initialized).toContain('Project: setup-polish');
    expect(initialized).toContain('Setup checklist');
    expect(initialized).toContain('Account: connect this terminal to AgentFeed → agentfeed login');
    expect(initialized).toContain('1. agentfeed login');
    expect(already).toContain('AgentFeed already initialized');
    expect(already).toContain('Existing AgentFeed config kept.');
    expect(already).toContain('Project: existing config kept');
    expect(already).toContain('Reinitialize: backup and recreate config only if needed → agentfeed init --force');
    expect(already).toContain('3. agentfeed init --force');
  });

  it('renders forced reinitialization backups as project-relative paths', () => {
    // Given: a forced init outcome with backup files.
    const text = renderInitHumanLines(forcedInput, {
      heading: (text) => text,
      section: (text) => text,
      command: (text) => text
    }).join('\n');

    // Then: backup paths are visible without leaking machine-absolute temp roots.
    expect(text).toContain('AgentFeed reinitialized');
    expect(text).toContain('AgentFeed config recreated after backing up existing files.');
    expect(text).toContain('Backups');
    expect(text).toContain('.agentfeed/backups/config.20260612.json');
    expect(text).toContain('.agentfeed/backups/redaction-rules.20260612.json');
    expect(text).not.toContain('/tmp/agentfeed-init/.agentfeed/backups');
  });

  it('returns state-specific setup checklist items', () => {
    // Given / When: init checklist is derived for new and existing projects.
    const fresh = initSetupChecklist(false);
    const existing = initSetupChecklist(true);

    // Then: follow-up actions match the state of initialization.
    expect(fresh.map((item) => item.name)).toEqual(['Project', 'Account', 'Agent hook', 'First draft']);
    expect(existing.map((item) => item.name)).toEqual(['Project', 'Status', 'First draft', 'Reinitialize']);
  });
});
