import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { ensureCliBuilt } from './build-cli.js';

const repoRoot = resolve('.');
const cliPath = join(repoRoot, 'dist', 'cli', 'index.js');

let dir: string;
let home: string;

beforeAll(() => {
  ensureCliBuilt(repoRoot);
});

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-status-local-state-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('status local state diagnostics', () => {
  it('status reports the collection cursor and warns when pending drafts may make the next collect look empty', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'cursor-status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await writeFile(join(dir, '.agentfeed', 'state.json'), JSON.stringify({ last_collected_at: '2026-05-20T02:00:00.000Z' }));
    await mkdir(join(dir, '.agentfeed', 'drafts'), { recursive: true });
    await writeFile(join(dir, '.agentfeed', 'drafts', 'draft_pending.json'), JSON.stringify({
      id: 'draft_pending',
      upload: { uploaded: false }
    }));

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Last collection cursor: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('Next default collection since: 2026-05-20T02:00:00.000Z');
    expect(stdout).toContain('Uploads: 1 pending draft → agentfeed publish --latest --yes');
    expect(stdout).toContain('Warning: pending local drafts exist while a collection cursor is set');
    expect(stdout).toContain('--all/--since');
  });

  it('status reports malformed collection cursor as an explicit warning', async () => {
    execFileSync(process.execPath, [cliPath, 'init', '--no-git-check', '--project-name', 'cursor-status-invalid'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home }
    });
    await writeFile(join(dir, '.agentfeed', 'state.json'), '{not-json');

    const stdout = execFileSync(process.execPath, [cliPath, 'status'], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, HOME: home, AGENTFEED_TOKEN: '' }
    });

    expect(stdout).toContain('Health: attention needed');
    expect(stdout).toContain('AgentFeed collection cursor is unreadable');
    expect(stdout).toContain('.agentfeed/state.json');
    expect(stdout).toContain('Last collection cursor: none');
    expect(stdout).toContain('Next default collection since: beginning');
  });

});
