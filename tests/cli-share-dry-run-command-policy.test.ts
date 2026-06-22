import { describe, expect, it } from 'vitest';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { useShareGuidanceFixture } from './cli-share-guidance-helpers.js';

const fixture = useShareGuidanceFixture();

type DryRunProjectConfig = {
  readonly collection: Record<string, unknown> & { run_tests_on_collect?: boolean };
  readonly commands: Record<string, unknown> & { test?: string | null; build?: string | null };
} & Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonRecord(text: string, label: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(text);
  if (!isRecord(parsed)) throw new Error(`${label} must be a JSON object`);
  return parsed;
}

function parseDryRunProjectConfig(text: string): DryRunProjectConfig {
  const parsed = parseJsonRecord(text, 'project config');
  if (!isRecord(parsed.collection) || !isRecord(parsed.commands)) throw new Error('project config is missing command settings');
  return {
    ...parsed,
    collection: {
      ...parsed.collection,
      run_tests_on_collect: parsed.collection.run_tests_on_collect === true
    },
    commands: {
      ...parsed.commands,
      test: typeof parsed.commands.test === 'string' ? parsed.commands.test : null,
      build: typeof parsed.commands.build === 'string' ? parsed.commands.build : null
    }
  };
}

describe('share CLI dry-run command execution policy', () => {
  it('dry-run skips configured project commands even when command collection is enabled', async () => {
    const configPath = join(fixture.dir(), '.agentfeed', 'config.json');
    const commandPath = join(fixture.dir(), '.agentfeed', 'dry-run-command.js');
    const markerPath = join(fixture.dir(), '.agentfeed', 'dry-run-command-ran');
    const config = parseDryRunProjectConfig(await readFile(configPath, 'utf8'));
    const dryRunConfig = {
      ...config,
      collection: { ...config.collection, run_tests_on_collect: true },
      commands: { ...config.commands, test: `${process.execPath} .agentfeed/dry-run-command.js`, build: null }
    };
    await writeFile(configPath, JSON.stringify(dryRunConfig, null, 2));
    await writeFile(commandPath, 'require("node:fs").writeFileSync(".agentfeed/dry-run-command-ran", "yes");\n');
    await writeFile(join(fixture.dir(), 'src', 'api.ts'), 'export const ok = false;\nexport const dryRun = true;\n');

    const { stdout } = await fixture.runCli([
      'share',
      '--dry-run',
      '--all',
    ]);

    expect(stdout).toContain('Dry run complete');
    await expect(readFile(markerPath, 'utf8')).rejects.toThrow();
  });
});
