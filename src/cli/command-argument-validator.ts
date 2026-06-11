import { COMMAND_ARG_SPECS } from './command-arg-specs.js';
import { PUBLIC_COMMANDS } from './command-definitions.js';
import { buildCommandOptionSets } from './command-option-sets.js';
import { assertNoConflictingOptions } from './conflict-validation.js';
import { bareDoubleDashError } from './bare-double-dash-error.js';
import { consumeLongOption } from './long-option-consumption.js';
import { parseLongOptionToken } from './long-option-token.js';
import { consumeShortOption } from './option-consumption.js';
import { assertValidPositionals } from './positional-validation.js';
import { unknownCommandError } from './unknown-command-error.js';
import { unknownOptionError } from './unknown-option-error.js';

export function validateCommandArgs(command: string, args: readonly string[]): void {
  const spec = COMMAND_ARG_SPECS[command];
  if (!spec) throw unknownCommandError({ command, knownCommands: PUBLIC_COMMANDS });
  const { flags, valueOptions } = buildCommandOptionSets(spec);
  const positionals: string[] = [];
  const seenOptions = new Set<string>();

  for (let index = 0; index < args.length; index += 1) {
    const raw = args[index];
    if (raw === '--') {
      throw bareDoubleDashError(command);
    }
    if (raw.startsWith('--')) {
      const optionToken = parseLongOptionToken(raw);
      const consumption = consumeLongOption({
        command,
        optionToken,
        valueOptions,
        flags,
        args,
        index,
        unknownOptionError: (optionName) => unknownOptionError({ command, optionName, optionSpec: spec })
      });
      seenOptions.add(consumption.optionName);
      index = consumption.nextIndex;
      continue;
    }
    if (raw.startsWith('-')) {
      seenOptions.add(consumeShortOption({ optionName: raw, flags, unknownOptionError: unknownOptionError({ command, optionName: raw, optionSpec: spec }) }).optionName);
      continue;
    }
    positionals.push(raw);
  }

  assertValidPositionals({ positionals, validatePositionals: spec.validatePositionals });
  assertNoConflictingOptions({ command, seenOptions, conflicts: spec.conflicts ?? [] });
}
