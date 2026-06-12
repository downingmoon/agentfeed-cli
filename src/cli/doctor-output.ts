import {
  doctorPriorityActions,
  doctorSummary,
  type DoctorPriorityAction,
  type DoctorReadinessItem,
  type DoctorSummary
} from './doctor-readiness.js';
import { formatWarningLines } from './diagnostic-formatters.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import * as ui from './ui.js';

export type DoctorCheckValue = boolean | string;
export type DoctorCheckTuple = readonly [name: string, value: DoctorCheckValue];

export type DoctorCheckRow = {
  readonly name: string;
  readonly value: DoctorCheckValue;
};

export type DoctorOutputInput = {
  readonly readiness: readonly DoctorReadinessItem[];
  readonly runtimeChecks: readonly DoctorCheckTuple[];
  readonly accountChecks: readonly DoctorCheckTuple[];
  readonly apiChecks: readonly DoctorCheckTuple[];
  readonly projectChecks: readonly DoctorCheckTuple[];
  readonly collectionChecks: readonly DoctorCheckTuple[];
  readonly warnings: readonly string[];
  readonly agentSignalSummary: unknown;
  readonly agentSignals: readonly string[];
  readonly nextActions: readonly string[];
};

export type DoctorJsonPayload = {
  readonly summary: DoctorSummary;
  readonly readiness: readonly DoctorReadinessItem[];
  readonly priority_actions: readonly DoctorPriorityAction[];
  readonly runtime: readonly DoctorCheckRow[];
  readonly account: readonly DoctorCheckRow[];
  readonly api: readonly DoctorCheckRow[];
  readonly project: readonly DoctorCheckRow[];
  readonly collection: readonly DoctorCheckRow[];
  readonly warnings: readonly string[];
  readonly agent_signal_summary: unknown;
  readonly agent_signals: readonly string[];
  readonly next_actions: readonly string[];
};

export type DoctorOutputStyle = {
  readonly heading: (text: string) => string;
  readonly section: (text: string) => string;
  readonly command: (text: string) => string;
  readonly good: (text: string) => string;
  readonly warn: (text: string) => string;
};

const DEFAULT_STYLE: DoctorOutputStyle = {
  heading: ui.heading,
  section: ui.section,
  command: ui.command,
  good: ui.good,
  warn: ui.warn
};

export function doctorCheckRows(checks: readonly DoctorCheckTuple[]): DoctorCheckRow[] {
  return checks.map(([name, value]) => ({ name, value }));
}

export function doctorJsonPayload(input: DoctorOutputInput): DoctorJsonPayload {
  return {
    summary: doctorSummary(input.readiness),
    readiness: input.readiness,
    priority_actions: doctorPriorityActions(input.readiness),
    runtime: doctorCheckRows(input.runtimeChecks),
    account: doctorCheckRows(input.accountChecks),
    api: doctorCheckRows(input.apiChecks),
    project: doctorCheckRows(input.projectChecks),
    collection: doctorCheckRows(input.collectionChecks),
    warnings: input.warnings,
    agent_signal_summary: input.agentSignalSummary,
    agent_signals: input.agentSignals,
    next_actions: input.nextActions
  };
}

export function renderDoctorHumanLines(input: DoctorOutputInput, style: DoctorOutputStyle = DEFAULT_STYLE): string[] {
  return [
    style.heading('AgentFeed doctor'),
    '',
    ...renderDoctorSummaryLines(input.readiness, style),
    ...renderDoctorChecksLines('Runtime', input.runtimeChecks, style),
    ...renderDoctorChecksLines('Account', input.accountChecks, style),
    ...renderDoctorChecksLines('API', input.apiChecks, style),
    ...renderDoctorChecksLines('Project', input.projectChecks, style),
    ...renderDoctorChecksLines('Collection', input.collectionChecks, style),
    ...renderDoctorWarningLines(input.warnings, style),
    style.section('Agent signals'),
    ...input.agentSignals,
    '',
    style.section('Next'),
    ...renderRecommendedCommandLines({ commands: input.nextActions, command: style.command })
  ];
}

function renderDoctorChecksLines(title: string, checks: readonly DoctorCheckTuple[], style: DoctorOutputStyle): string[] {
  return [
    style.section(title),
    ...checks.map(([name, value]) => `${doctorCheckMarker(value, style)} ${name}: ${value}`),
    ''
  ];
}

function renderDoctorSummaryLines(readiness: readonly DoctorReadinessItem[], style: DoctorOutputStyle): string[] {
  const summary = doctorSummary(readiness);
  const priorityActions = doctorPriorityActions(readiness);
  return [
    style.section('Summary'),
    `Overall: ${summary.status === 'ready' ? 'ready' : 'attention needed'} (${summary.ready} ready, ${summary.attention} attention)`,
    ...readiness.map((item) => {
      const next = item.next_action ? ` → ${item.next_action}` : '';
      return `${doctorReadinessMarker(item.status, style)} ${item.name}: ${item.detail}${next}`;
    }),
    ...renderDoctorPriorityActionLines(priorityActions),
    ''
  ];
}

function renderDoctorPriorityActionLines(actions: readonly DoctorPriorityAction[]): string[] {
  if (!actions.length) return [];
  return [
    'Fix first:',
    ...actions.slice(0, 3).flatMap((action, index) => [
      `  ${index + 1}. ${action.name}: ${action.detail}`,
      `     Run: ${action.command}`
    ])
  ];
}

function renderDoctorWarningLines(warnings: readonly string[], style: DoctorOutputStyle): string[] {
  if (!warnings.length) return [];
  return [
    style.section('Warnings'),
    ...warnings.flatMap((warning) => formatWarningLines(warning)),
    ''
  ];
}

function doctorReadinessMarker(status: DoctorReadinessItem['status'], style: DoctorOutputStyle): string {
  return status === 'ready' ? style.good('✓') : style.warn('!');
}

function doctorCheckMarker(value: DoctorCheckValue, style: DoctorOutputStyle): string {
  const text = String(value).toLowerCase();
  if (text.startsWith('yes') || text === 'ready' || text === 'configured') return style.good('✓');
  if (text.startsWith('no') || text.includes('invalid') || text.includes('unreachable')) return style.warn('!');
  if (text.startsWith('skipped') || text.startsWith('unknown') || text.startsWith('unavailable')) return '-';
  return '•';
}
