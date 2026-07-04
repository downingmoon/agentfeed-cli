import { KNOWN_COMMANDS, PUBLIC_COMMANDS } from './command-definitions.js';
import {
  commandUsageError,
  completionUnexpectedArgumentMessage,
  flaglessOptionSuggestionLines,
  helpTopicError,
  helpUnexpectedArgumentMessage,
  helpUnexpectedTokenArgumentMessage,
  tokenRotateUnexpectedArgumentMessage,
  tokenUsageMessage,
  unknownTokenSubcommandMessage,
  unsupportedCompletionShellMessage
} from './command-recovery.js';

export const SUPPORTED_COMPLETION_SHELLS = ['zsh', 'bash', 'fish'] as const;

export type CommandArgSpec = {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
  readonly conflicts?: readonly (readonly [string, string])[];
  readonly validatePositionals?: (positionals: readonly string[]) => string | null;
};

function flaglessOptionSuggestionsFor(command: string, positionals: readonly string[], prefixPositionals: readonly string[] = []): string[] {
  const spec = COMMAND_ARG_SPECS[command];
  return flaglessOptionSuggestionLines(command, positionals, spec?.flags ?? [], prefixPositionals);
}

const NO_POSITIONALS = (command: string) => (positionals: readonly string[]) =>
  positionals.length
    ? commandUsageError(
      `Unexpected argument for ${command}: ${positionals[0]}`,
      command,
      flaglessOptionSuggestionsFor(command, positionals)
    )
    : null;

export const COMMAND_ARG_SPECS: Readonly<Record<string, CommandArgSpec>> = {
  help: {
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return null;
      if (positionals[0] === 'token') {
        if (positionals.length === 1) return null;
        if (positionals.length === 2 && positionals[1] === 'rotate') return null;
        return helpUnexpectedTokenArgumentMessage(positionals[1]);
      }
      if (positionals.length > 1) return helpUnexpectedArgumentMessage(positionals[1]);
      return KNOWN_COMMANDS.has(positionals[0]) ? null : helpTopicError(positionals[0], PUBLIC_COMMANDS);
    }
  },
  commands: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('commands')
  },
  init: {
    flags: ['--no-git-check', '--force', '--json'],
    valueOptions: ['--project-name'],
    validatePositionals: NO_POSITIONALS('init')
  },
  login: {
    flags: ['--token-stdin', '--no-save', '--no-open', '--browser', '--json'],
    valueOptions: ['--token', '--api-base-url'],
    validatePositionals: NO_POSITIONALS('login')
  },
  logout: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('logout')
  },
  status: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('status')
  },
  rotate: {
    flags: ['--browser', '--no-save', '--no-open'],
    valueOptions: ['--api-base-url'],
    validatePositionals: NO_POSITIONALS('rotate')
  },
  token: {
    flags: ['--browser', '--no-save', '--no-open'],
    valueOptions: ['--api-base-url'],
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return tokenUsageMessage();
      if (positionals[0] !== 'rotate') return unknownTokenSubcommandMessage(positionals[0]);
      if (positionals.length > 1) return tokenRotateUnexpectedArgumentMessage(
        positionals[1],
        flaglessOptionSuggestionsFor('token', positionals.slice(1), ['rotate'])
      );
      return null;
    }
  },
  collect: {
    flags: ['--dry', '--dry-run', '--all', '--force', '--run-configured-commands', '--explain', '--json', '--upload', '--open-review', '--no-open-review', '--no-save-cursor', '--no-upload'],
    valueOptions: ['--source', '--session-file', '--since', '--until'],
    conflicts: [['--upload', '--no-upload'], ['--dry', '--upload'], ['--dry-run', '--upload'], ['--open-review', '--no-open-review']],
    validatePositionals: NO_POSITIONALS('collect')
  },
  share: {
    flags: ['--dry', '--dry-run', '--yes', '-y', '--open-review', '--no-open-review', '--all', '--force', '--run-configured-commands', '--explain', '--no-save-cursor', '--no-clipboard', '--no-clip', '--json', '--clipboard'],
    valueOptions: ['--source', '--session-file', '--since', '--until', '--note'],
    conflicts: [
      ['--dry', '--yes'],
      ['--dry', '-y'],
      ['--dry-run', '--yes'],
      ['--dry-run', '-y'],
      ['--open-review', '--no-open-review'],
      ['--clipboard', '--no-clipboard'],
      ['--clipboard', '--no-clip']
    ],
    validatePositionals: NO_POSITIONALS('share')
  },
  preview: {
    flags: ['--latest', '--remote', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('preview')
  },
  publish: {
    flags: ['--latest', '--yes', '-y', '--json', '--clipboard', '--no-clipboard', '--open-review', '--no-open-review'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest'], ['--clipboard', '--no-clipboard'], ['--open-review', '--no-open-review']],
    validatePositionals: NO_POSITIONALS('publish')
  },
  scan: {
    flags: ['--latest', '--dry-run', '--dry', '--json'],
    valueOptions: ['--id', '--path'],
    conflicts: [['--id', '--latest'], ['--id', '--path'], ['--latest', '--path']],
    validatePositionals: NO_POSITIONALS('scan')
  },
  doctor: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('doctor')
  },
  version: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('version')
  },
  drafts: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('drafts')
  },
  discard: {
    flags: ['--latest', '--yes', '-y', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('discard')
  },
  open: {
    flags: ['--latest', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('open')
  },
  completion: {
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return null;
      if (positionals.length > 1) return completionUnexpectedArgumentMessage(positionals[1]);
      if (SUPPORTED_COMPLETION_SHELLS.some((supportedShell) => supportedShell === positionals[0])) return null;
      return unsupportedCompletionShellMessage(positionals[0], SUPPORTED_COMPLETION_SHELLS);
    }
  }
};
