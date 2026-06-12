import { relative } from 'node:path';
import { initNextActions } from './guidance-actions.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type InitChecklistItem = {
  readonly name: string;
  readonly detail: string;
  readonly next_action?: string;
};

export type InitOutputInput = {
  readonly alreadyInitialized: boolean;
  readonly project: {
    readonly name: string;
    readonly visibility: string;
    readonly tags: readonly string[];
  };
  readonly root: string;
  readonly backupPaths: readonly string[];
};

export type InitJsonPayload = {
  readonly already_initialized: boolean;
  readonly project: {
    readonly name: string;
    readonly visibility: string;
    readonly tags: readonly string[];
  };
  readonly root: string;
  readonly config_path: typeof CONFIG_PATH;
  readonly backup_paths: readonly string[];
  readonly setup_checklist: readonly InitChecklistItem[];
  readonly next_actions: readonly string[];
};

export type InitOutputStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
};

const CONFIG_PATH = '.agentfeed/config.json';
const DEFAULT_STYLE: InitOutputStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command
};

export function initSetupChecklist(alreadyInitialized: boolean): InitChecklistItem[] {
  return alreadyInitialized
    ? [
      { name: 'Project', detail: 'existing config kept' },
      { name: 'Status', detail: 'inspect credentials, API, hooks, and drafts', next_action: 'agentfeed status' },
      { name: 'First draft', detail: 'collect locally without uploading', next_action: 'agentfeed share --dry' },
      { name: 'Reinitialize', detail: 'backup and recreate config only if needed', next_action: 'agentfeed init --force' }
    ]
    : [
      { name: 'Project', detail: 'config ready' },
      { name: 'Account', detail: 'connect this terminal to AgentFeed', next_action: 'agentfeed login' },
      { name: 'Agent hook', detail: 'capture Claude Code sessions automatically', next_action: 'agentfeed hook install claude-code' },
      { name: 'First draft', detail: 'collect locally without uploading', next_action: 'agentfeed share --dry' }
    ];
}

export function initJsonPayload(input: InitOutputInput): InitJsonPayload {
  return {
    already_initialized: input.alreadyInitialized,
    project: {
      name: input.project.name,
      visibility: input.project.visibility,
      tags: input.project.tags
    },
    root: input.root,
    config_path: CONFIG_PATH,
    backup_paths: input.backupPaths.map((backupPath) => projectRelativePath(input.root, backupPath)),
    setup_checklist: initSetupChecklist(input.alreadyInitialized),
    next_actions: initNextActions(input.alreadyInitialized)
  };
}

export function renderInitHumanLines(input: InitOutputInput, style: InitOutputStyle = DEFAULT_STYLE): string[] {
  const lines = [
    style.heading(initHeading(input)),
    initMessage(input),
    '',
    style.section('Summary'),
    `Project: ${input.project.name}`,
    `Visibility: ${input.project.visibility}`,
    `Config: ${CONFIG_PATH}`
  ];

  if (input.backupPaths.length) {
    lines.push('', style.section('Backups'));
    for (const backupPath of input.backupPaths) lines.push(projectRelativePath(input.root, backupPath));
  }

  lines.push(
    '',
    ...renderInitSetupChecklistLines(initSetupChecklist(input.alreadyInitialized), style),
    '',
    style.section('Next'),
    ...renderRecommendedCommandLines({ commands: initNextActions(input.alreadyInitialized), command: style.command })
  );

  return lines;
}

function initHeading(input: InitOutputInput): string {
  if (input.alreadyInitialized) return 'AgentFeed already initialized';
  return input.backupPaths.length ? 'AgentFeed reinitialized' : 'AgentFeed initialized';
}

function initMessage(input: InitOutputInput): string {
  if (input.alreadyInitialized) return 'Existing AgentFeed config kept.';
  return input.backupPaths.length
    ? 'AgentFeed config recreated after backing up existing files.'
    : 'Project config created.';
}

function renderInitSetupChecklistLines(items: readonly InitChecklistItem[], style: InitOutputStyle): string[] {
  return [
    style.section('Setup checklist'),
    ...items.map((item) => {
      const next = item.next_action ? ` → ${item.next_action}` : '';
      return `• ${item.name}: ${item.detail}${next}`;
    })
  ];
}

function projectRelativePath(projectRoot: string, path: string): string {
  const rel = relative(projectRoot, path);
  return rel && !rel.startsWith('..') ? rel : path;
}
