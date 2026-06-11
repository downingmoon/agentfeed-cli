export interface CommandOptionSetInput {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
}

export interface CommandOptionSets {
  readonly flags: ReadonlySet<string>;
  readonly valueOptions: ReadonlySet<string>;
}

export function buildCommandOptionSets(input: CommandOptionSetInput): CommandOptionSets {
  return {
    flags: new Set([...(input.flags ?? []), '--help', '-h']),
    valueOptions: new Set(input.valueOptions ?? [])
  };
}
