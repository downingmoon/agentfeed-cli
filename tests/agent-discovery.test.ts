import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdir, mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectAgentSignals, formatAgentSignalLines } from '../src/collectors/agent-discovery.js';
import { initProject } from '../src/config/project-config.js';

let dir: string;
let home: string;
const oldHome = process.env.HOME;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'agentfeed-discovery-'));
  home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
  process.env.HOME = home;
});

afterEach(async () => {
  process.env.HOME = oldHome;
  await rm(dir, { recursive: true, force: true });
  await rm(home, { recursive: true, force: true });
});

describe('agent discovery', () => {
  it('detects multiple local agent and plugin signals', async () => {
    await mkdir(join(home, '.claude', 'projects'), { recursive: true });
    await mkdir(join(home, '.codex', 'sessions'), { recursive: true });
    await mkdir(join(home, '.gemini', 'tmp', 'project', 'chats'), { recursive: true });
    await mkdir(join(dir, '.cursor'), { recursive: true });
    await mkdir(join(dir, '.omc', 'sessions'), { recursive: true });
    await mkdir(join(dir, '.omx', 'state'), { recursive: true });

    const signals = await detectAgentSignals({ cwd: dir, home });

    expect(signals.claude_code.detected).toBe(true);
    expect(signals.codex.detected).toBe(true);
    expect(signals.cursor.detected).toBe(true);
    expect(signals.gemini_cli.detected).toBe(true);
    expect(signals.omc.detected).toBe(true);
    expect(signals.omx.detected).toBe(true);
  });

  it('formats doctor-friendly signal lines with guidance', async () => {
    await mkdir(join(dir, '.omx', 'state'), { recursive: true });

    const lines = formatAgentSignalLines(await detectAgentSignals({ cwd: dir, home }));

    expect(lines).toContain('Agent signals:');
    expect(lines).toContain('Codex CLI: detected');
    expect(lines).toContain('OMX: detected');
    expect(lines).toContain('  Quality: high when Codex session rows are available; medium with OMX metadata only.');
    expect(lines).toContain('  Try: agentfeed collect --source codex --explain');
    expect(lines).toContain('  Plugin role: enriches Codex evidence with tokens, subagents, turns, and modes.');
    expect(lines).toContain('  Detected paths:');
    expect(lines.some((line) => line.includes('Run Gemini CLI in this project.'))).toBe(true);
    expect(lines.some((line) => line.includes('Try: agentfeed collect --source gemini-cli --explain'))).toBe(true);
  });

  it('auto-enables detected agents during init', async () => {
    await mkdir(join(home, '.codex', 'sessions'), { recursive: true });
    await mkdir(join(dir, '.cursor'), { recursive: true });
    await mkdir(join(home, '.gemini', 'tmp', 'project', 'chats'), { recursive: true });

    await initProject({ cwd: dir, noGitCheck: true });

    const config = JSON.parse(await readFile(join(dir, '.agentfeed', 'config.json'), 'utf8'));
    expect(config.agents.codex.enabled).toBe(true);
    expect(config.agents.cursor.enabled).toBe(true);
    expect(config.agents.gemini_cli.enabled).toBe(true);
  });
});
