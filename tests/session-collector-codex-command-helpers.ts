import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type CodexRow = Readonly<Record<string, unknown>>;

export type CodexFixture = {
  readonly dir: string;
  readonly cleanup: () => Promise<void>;
};

type ShellStep = {
  readonly kind: 'shell';
  readonly callId: string;
  readonly cmd: string;
  readonly output: string;
  readonly status?: string;
  readonly toolName?: string;
};

type ToolStep = {
  readonly kind: 'tool';
  readonly callId: string;
  readonly name: string;
  readonly arguments: unknown;
  readonly output: string;
};

type AgentMessageStep = {
  readonly kind: 'agent_message';
  readonly phase: string;
};

type CustomToolStep = {
  readonly kind: 'custom_tool';
  readonly callId: string;
  readonly name: string;
  readonly status: string;
};

type CodexStep = ShellStep | ToolStep | AgentMessageStep | CustomToolStep;

type CodexSessionRowsInput = {
  readonly id: string;
  readonly cwd: string;
  readonly steps: readonly CodexStep[];
};

type ToolCallRowInput = {
  readonly timestamp: string;
  readonly callId: string;
  readonly name: string;
  readonly arguments: unknown;
};

type ToolOutputRowInput = {
  readonly timestamp: string;
  readonly callId: string;
  readonly output: string;
  readonly status?: string;
};

export async function createCodexFixture(): Promise<CodexFixture> {
  const dir = await mkdtemp(join(tmpdir(), 'agentfeed-session-codex-command-'));
  execFileSync('git', ['init'], { cwd: dir });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: dir });
  await mkdir(join(dir, 'src'), { recursive: true });
  await writeFile(join(dir, 'src', 'api.ts'), 'export const ok = true;\n');
  execFileSync('git', ['add', '.'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'initial'], { cwd: dir, stdio: 'ignore' });
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

export async function writeJsonl(path: string, rows: readonly CodexRow[]): Promise<void> {
  await writeFile(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`);
}

export function codexSessionRows(input: CodexSessionRowsInput): CodexRow[] {
  return [
    { timestamp: timestampAt(0), type: 'session_meta', payload: { id: input.id, cwd: input.cwd } },
    ...input.steps.flatMap((step, index) => rowsForStep(step, input.cwd, index))
  ];
}

function rowsForStep(step: CodexStep, cwd: string, index: number): CodexRow[] {
  const timestamp = timestampAt(index * 2 + 1);
  const outputTimestamp = timestampAt(index * 2 + 2);
  switch (step.kind) {
    case 'shell':
      return [
        toolCallRow({ timestamp, callId: step.callId, name: step.toolName ?? 'exec_command', arguments: { cmd: step.cmd, workdir: cwd } }),
        toolOutputRow({ timestamp: outputTimestamp, callId: step.callId, output: step.output, status: step.status })
      ];
    case 'tool':
      return [toolCallRow({ timestamp, callId: step.callId, name: step.name, arguments: step.arguments }), toolOutputRow({ timestamp: outputTimestamp, callId: step.callId, output: step.output })];
    case 'agent_message':
      return [{ timestamp, type: 'event_msg', payload: { type: 'agent_message', phase: step.phase } }];
    case 'custom_tool':
      return [{ timestamp, type: 'response_item', payload: { type: 'custom_tool_call', name: step.name, status: step.status, call_id: step.callId } }];
  }
}

function toolCallRow(input: ToolCallRowInput): CodexRow {
  return {
    timestamp: input.timestamp,
    type: 'response_item',
    payload: { type: 'function_call', name: input.name, arguments: JSON.stringify(input.arguments), call_id: input.callId }
  };
}

function toolOutputRow(input: ToolOutputRowInput): CodexRow {
  return {
    timestamp: input.timestamp,
    type: 'response_item',
    payload: { type: 'function_call_output', call_id: input.callId, output: input.output, ...(input.status ? { status: input.status } : {}) }
  };
}

function timestampAt(seconds: number): string {
  return `2026-05-20T00:00:${String(seconds).padStart(2, '0')}Z`;
}
