import { describe, expect, it } from 'vitest';
import { doctorCheckRows, doctorJsonPayload, renderDoctorHumanLines } from '../src/cli/doctor-output.js';
import type { DoctorReadinessItem } from '../src/cli/doctor-readiness.js';

const readiness: readonly DoctorReadinessItem[] = [
  { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' },
  { name: 'API', status: 'ready', detail: 'reachable and compatible' },
  { name: 'Project', status: 'attention', detail: 'not initialized', next_action: 'agentfeed init' }
];

const outputInput = {
  readiness,
  runtimeChecks: [['Node version', '24.0.0'], ['agentfeed version', '0.2.0']] as const,
  accountChecks: [['credential source', 'missing'], ['ingestion token exists', 'no']] as const,
  apiChecks: [['API ready', 'yes (200)']] as const,
  projectChecks: [['project config valid', 'no']] as const,
  collectionChecks: [['last collection cursor', 'unavailable']] as const,
  warnings: ['ignored malformed AgentFeed credentials file at /tmp/credentials.json'],
  agentSignalSummary: { codex: 'detected', claude: 'missing' },
  agentSignals: ['codex: detected', 'claude: missing'],
  nextActions: ['agentfeed init', 'agentfeed login', 'agentfeed doctor']
} as const;

const plainStyle = {
  heading: (text: string) => text,
  section: (text: string) => text,
  command: (text: string) => text,
  good: (text: string) => text,
  warn: (text: string) => text
} as const;

describe('doctor output helpers', () => {
  it('builds doctor JSON payload from readiness and check tuples', () => {
    // Given: doctor readiness, checks, warnings, and recommended next actions.
    const payload = doctorJsonPayload(outputInput);

    // Then: the JSON contract keeps computed summary, priority actions, rows, warnings, and signals.
    expect(payload.summary).toEqual({ status: 'attention_needed', ready: 1, attention: 2 });
    expect(payload.priority_actions).toEqual([
      { name: 'Project', detail: 'not initialized', command: 'agentfeed init' },
      { name: 'Account', detail: 'token missing', command: 'agentfeed login' }
    ]);
    expect(payload.runtime).toEqual([
      { name: 'Node version', value: '24.0.0' },
      { name: 'agentfeed version', value: '0.2.0' }
    ]);
    expect(payload.account).toEqual([
      { name: 'credential source', value: 'missing' },
      { name: 'ingestion token exists', value: 'no' }
    ]);
    expect(payload.warnings).toEqual(['ignored malformed AgentFeed credentials file at /tmp/credentials.json']);
    expect(payload.agent_signal_summary).toEqual({ codex: 'detected', claude: 'missing' });
    expect(payload.agent_signals).toEqual(['codex: detected', 'claude: missing']);
    expect(payload.next_actions).toEqual(['agentfeed init', 'agentfeed login', 'agentfeed doctor']);
  });

  it('renders doctor human output with summary, check sections, warnings, agent signals, and next actions', () => {
    // Given: a doctor output view with attention items and warnings.
    const text = renderDoctorHumanLines(outputInput, plainStyle).join('\n');

    // Then: the human output preserves section order, markers, priority fixes, and recommended commands.
    expect(text).toContain('AgentFeed doctor');
    expect(text).toContain('Summary');
    expect(text).toContain('Overall: attention needed (1 ready, 2 attention)');
    expect(text).toContain('! Account: token missing → agentfeed login');
    expect(text).toContain('✓ API: reachable and compatible');
    expect(text).toContain('Fix first:');
    expect(text).toContain('  1. Project: not initialized');
    expect(text).toContain('     Run: agentfeed init');
    expect(text).toContain('Runtime');
    expect(text).toContain('• Node version: 24.0.0');
    expect(text).toContain('Account');
    expect(text).toContain('! ingestion token exists: no');
    expect(text).toContain('Warnings');
    expect(text).toContain('Warning: ignored malformed AgentFeed credentials file at /tmp/credentials.json');
    expect(text).toContain('Agent signals');
    expect(text).toContain('codex: detected');
    expect(text).toContain('Next');
    expect(text).toContain('Recommended order:');
    expect(text).toContain('  1. agentfeed init');
  });

  it('converts doctor check tuples to JSON rows', () => {
    // Given / When: doctor check tuples are mapped to rows.
    const rows = doctorCheckRows([['API ready', 'no (ECONNREFUSED)'], ['hook configured', true]] as const);

    // Then: row names and values remain machine-readable.
    expect(rows).toEqual([
      { name: 'API ready', value: 'no (ECONNREFUSED)' },
      { name: 'hook configured', value: true }
    ]);
  });
});
