import { flag } from './args.js';

export type VersionCommandInput = {
  readonly args: readonly string[];
  readonly version: string;
};

export function versionCommandOutput(input: VersionCommandInput): string {
  if (flag(input.args, '--json')) return JSON.stringify({ version: input.version }, null, 2);
  return input.version;
}
