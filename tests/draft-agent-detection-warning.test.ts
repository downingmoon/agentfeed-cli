import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultProjectConfig } from '../src/config/defaults.js';

vi.mock('../src/collectors/agent-discovery.js', () => ({
  detectAgentSignals: async () => {
    throw new Error('simulated detector failure');
  }
}));

const { collectDraftWithStatus } = await import('../src/draft/create.js');

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-agent-detection-warning-'));
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, '.agentfeed'), { recursive: true });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'index.ts'), 'export const ready = true;\n');
  const config = defaultProjectConfig({ name: 'Agent Detection Warning', slug: 'agent-detection-warning' });
  config.agents.claude_code.enabled = true;
  config.agents.codex.enabled = true;
  await writeFile(join(dir, '.agentfeed', 'config.json'), `${JSON.stringify(config, null, 2)}\n`);
  execFileSync('git', ['add', '.'], { cwd: dir, stdio: 'ignore' });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  await writeFile(join(dir, 'src', 'index.ts'), 'export const ready = "changed";\n');
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe('collect draft agent signal detection warnings', () => {
  it('surfaces auto-detection failures instead of silently falling back to generic attribution', async () => {
    const result = await collectDraftWithStatus({
      cwd: dir,
      until: '2026-05-20T02:00:00Z',
      inferIdleGap: false
    });

    expect(result.draft.id).toMatch(/^draft_/);
    expect(result.warnings.join('\n')).toContain('Agent signal auto-detection failed');
    expect(result.warnings.join('\n')).toContain('simulated detector failure');
    expect(result.warnings.join('\n')).toContain('agentfeed doctor');
    expect(result.warnings.join('\n')).toContain('agentfeed collect --source <source> --explain');
  }, 60_000);
});
