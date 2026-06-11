import { conflictingOptionsMessage } from './command-recovery.js';

export interface ConflictValidationInput {
  readonly command: string;
  readonly seenOptions: ReadonlySet<string>;
  readonly conflicts: readonly (readonly [string, string])[];
}

export function assertNoConflictingOptions(input: ConflictValidationInput): void {
  const conflictError = conflictingOptionsMessage(input.command, input.seenOptions, input.conflicts);
  if (conflictError) throw new Error(conflictError);
}
