export interface LongOptionToken {
  readonly name: string;
  readonly inlineValue: string | null;
}

export function parseLongOptionToken(raw: string): LongOptionToken {
  const equalsIndex = raw.indexOf('=');
  if (equalsIndex < 0) return { name: raw, inlineValue: null };
  return { name: raw.slice(0, equalsIndex), inlineValue: raw.slice(equalsIndex + 1) };
}
