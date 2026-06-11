export interface PositionalValidationInput {
  readonly positionals: string[];
  readonly validatePositionals?: (positionals: string[]) => string | null;
}

export function assertValidPositionals(input: PositionalValidationInput): void {
  const positionalError = input.validatePositionals?.(input.positionals);
  if (positionalError) throw new Error(positionalError);
}
