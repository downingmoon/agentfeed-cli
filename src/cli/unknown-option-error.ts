import { unknownCommandOptionMessage } from './command-recovery.js';

export interface UnknownOptionErrorSpec {
  readonly flags?: readonly string[];
  readonly valueOptions?: readonly string[];
}

export interface UnknownOptionErrorInput {
  readonly command: string;
  readonly optionName: string;
  readonly optionSpec: UnknownOptionErrorSpec;
}

export function unknownOptionError(input: UnknownOptionErrorInput): Error {
  return new Error(unknownCommandOptionMessage(
    input.command,
    input.optionName,
    input.optionSpec.flags ?? [],
    input.optionSpec.valueOptions ?? []
  ));
}
