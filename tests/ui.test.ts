import { afterEach, describe, expect, it } from 'vitest';
import { color, sanitizeTerminalText, wrapKeyValue } from '../src/cli/ui.js';

const originalColorEnv = {
  FORCE_COLOR: process.env.FORCE_COLOR,
  NO_COLOR: process.env.NO_COLOR,
  AGENTFEED_NO_COLOR: process.env.AGENTFEED_NO_COLOR,
  AGENTFEED_PLAIN: process.env.AGENTFEED_PLAIN,
};

describe('CLI terminal output helpers', () => {
  afterEach(() => {
    for (const [name, value] of Object.entries(originalColorEnv)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it('removes ANSI and terminal control sequences from untrusted text', () => {
    const text = sanitizeTerminalText('safe\x1b[31m red \x1b]52;c;secret\x07\rrewrite');

    expect(text).toBe('safe red rewrite');
    expect(text).not.toMatch(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/);
    expect(text).not.toContain('\x1b');
  });

  it('sanitizes wrapped key/value text before measuring and rendering', () => {
    const lines = wrapKeyValue('Project\x1b[31m', 'agentfeed\x1b]52;c;secret\x07', { width: 80 });

    expect(lines).toEqual(['Project: agentfeed']);
  });

  it('preserves AgentFeed-owned color while dropping caller-supplied ANSI', () => {
    process.env.FORCE_COLOR = '1';
    delete process.env.NO_COLOR;
    delete process.env.AGENTFEED_NO_COLOR;
    delete process.env.AGENTFEED_PLAIN;

    const rendered = color('command\x1b[31m', 'cyan', { isTTY: true });

    expect(rendered).toContain('\x1b[36m');
    expect(rendered).toContain('command');
    expect(rendered).not.toContain('\x1b[31m');
  });
});
