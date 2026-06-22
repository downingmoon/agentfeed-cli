import { describe, expect, it } from 'vitest';
import { ANSI_ESCAPE_PATTERN, cliPath, dir, execFileAsync, home, useStatusDoctorCliEnvironment } from './cli-status-doctor-helpers.js';

type DoctorJsonOutput = {
  readonly runtime: Array<{ readonly name: string; readonly value: string }>;
  readonly account: Array<{ readonly name: string; readonly value: string }>;
  readonly api: Array<{ readonly name: string; readonly value: string }>;
  readonly project: Array<{ readonly name: string; readonly value: string }>;
  readonly collection: Array<{ readonly name: string; readonly value: string }>;
  readonly summary: { readonly status: string; readonly ready: number; readonly attention: number };
  readonly readiness: Array<{ readonly name: string; readonly status: string; readonly detail: string; readonly next_action?: string }>;
  readonly priority_actions: Array<{ readonly name: string; readonly detail: string; readonly command: string }>;
  readonly warnings: string[];
  readonly agent_signal_summary: {
    readonly detected_count: number;
    readonly missing_count: number;
    readonly signals: Array<{
      readonly key: string;
      readonly label: string;
      readonly detected: boolean;
      readonly status: string;
      readonly path_count: number;
      readonly guidance: string;
      readonly next_actions: string[];
    }>;
  };
  readonly agent_signals: string[];
  readonly next_actions: string[];
};

useStatusDoctorCliEnvironment();

describe('doctor JSON diagnostics output', () => {
  it('doctor json prints parseable diagnostics without human headings', async () => {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliPath, 'doctor', '--json'], {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        HOME: home,
        AGENTFEED_TOKEN: '',
        AGENTFEED_API_BASE_URL: 'http://161.33.171.81:18080/v1',
        AGENTFEED_ALLOW_INSECURE_API: '',
        FORCE_COLOR: undefined
      }
    });

    const output: DoctorJsonOutput = JSON.parse(stdout);
    expect(stderr).toBe('');
    expect(output.summary.status).toBe('attention_needed');
    expect(output.summary.attention).toBeGreaterThan(0);
    expect(output.readiness).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }),
      expect.objectContaining({ name: 'API', status: 'attention', detail: 'invalid API base URL', next_action: 'unset AGENTFEED_API_BASE_URL' })
    ]));
    expect(output.priority_actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'API', detail: 'invalid API base URL', command: 'unset AGENTFEED_API_BASE_URL' }),
      expect.objectContaining({ name: 'Account', detail: 'token missing', command: 'agentfeed login' })
    ]));
    expect(output.priority_actions[0]).toMatchObject({ name: 'API', command: 'unset AGENTFEED_API_BASE_URL' });
    expect(output.runtime.some((row) => row.name === 'agentfeed version')).toBe(true);
    expect(output.account.some((row) => row.name === 'credential source')).toBe(true);
    expect(output.api.some((row) => row.name === 'API base URL configured')).toBe(true);
    expect(output.project.some((row) => row.name === 'project config valid')).toBe(true);
    expect(output.collection.some((row) => row.name === 'last collection cursor')).toBe(true);
    expect(output.warnings.join('\n')).toContain('invalid AgentFeed API URL setting ignored for diagnostics');
    expect(output.agent_signal_summary.detected_count + output.agent_signal_summary.missing_count).toBe(output.agent_signal_summary.signals.length);
    expect(output.agent_signal_summary.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: 'codex',
        label: 'Codex CLI',
        status: expect.stringMatching(/detected|missing/),
        next_actions: expect.arrayContaining(['agentfeed collect --source codex --explain'])
      }),
      expect.objectContaining({
        key: 'claude_code',
        label: 'Claude Code',
        next_actions: expect.arrayContaining(['agentfeed hook install claude-code'])
      })
    ]));
    expect(Array.isArray(output.agent_signals)).toBe(true);
    expect(output.next_actions).toEqual([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed doctor'
    ]);
    expect(stdout).not.toContain('AgentFeed doctor');
    expect(stdout).not.toMatch(ANSI_ESCAPE_PATTERN);
    expect(stdout).not.toContain('af_live');
  });
});
