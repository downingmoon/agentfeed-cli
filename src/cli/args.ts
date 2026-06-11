export function flag(args: readonly string[], name: string): boolean {
  return args.includes(name);
}

export function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) {
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
    return value;
  }
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline === undefined) return undefined;
  const value = inline.slice(prefix.length);
  if (!value) throw new Error(`${name} requires a value.`);
  return value;
}
