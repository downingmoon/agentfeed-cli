export interface LongOptionClassificationInput {
  readonly name: string;
  readonly valueOptions: ReadonlySet<string>;
  readonly flags: ReadonlySet<string>;
}

export type LongOptionClassification =
  | { readonly kind: 'value'; readonly name: string }
  | { readonly kind: 'flag'; readonly name: string }
  | { readonly kind: 'unknown'; readonly name: string };

export function classifyLongOption(input: LongOptionClassificationInput): LongOptionClassification {
  if (input.valueOptions.has(input.name)) return { kind: 'value', name: input.name };
  if (input.flags.has(input.name)) return { kind: 'flag', name: input.name };
  return { kind: 'unknown', name: input.name };
}
