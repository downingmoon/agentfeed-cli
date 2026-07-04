import type { ChangedFileSummary } from '../types.js';
import { applyShellFileEvidence } from './agent-session-shell-files.js';
import { recordTestCommandResult, type AgentSessionTestMetricsAccumulator } from './agent-session-test-metrics.js';
import { isTestCommand } from './agent-session-tooling.js';

type CodexCommandInvocation = {
  readonly command: string;
  readonly workdir: string | null;
};

type CodexCommandRecord = {
  readonly invocations: readonly CodexCommandInvocation[];
  readonly test: boolean;
};

type CodexCommandOutput = {
  readonly cwd: string;
  readonly callId: string | null;
  readonly output: string;
  readonly failed: boolean;
  readonly files: Map<string, ChangedFileSummary>;
};

export type CodexCommandTracker = {
  readonly commandsRun: number;
  readonly failedCommands: number;
  readonly testsRun: number;
  readonly testsPassed: number;
  readonly register: (callId: string | null, command: string, workdir: string | null) => void;
  readonly recordOutput: (input: CodexCommandOutput) => void;
};

export type CodexSubagentTracker = {
  readonly spawned: number;
  readonly track: (callId: string | null) => void;
  readonly markOutputFailed: (callId: string | null, failed: boolean) => void;
};

export function createCodexCommandTracker(): CodexCommandTracker {
  const commands = new Map<string, CodexCommandRecord>();
  const testMetrics: AgentSessionTestMetricsAccumulator = { testsRun: 0, testsPassed: 0 };
  let commandsRun = 0;
  let failedCommands = 0;

  function register(callId: string | null, command: string, workdir: string | null): void {
    if (!command) return;
    commandsRun += 1;
    const test = isTestCommand(command);
    if (!callId) {
      if (test) recordTestCommandResult(testMetrics, '', false);
      return;
    }
    const existing = commands.get(callId);
    commands.set(callId, {
      invocations: [...(existing?.invocations ?? []), { command, workdir }],
      test: Boolean(existing?.test || test)
    });
  }

  function recordOutput(input: CodexCommandOutput): void {
    const command = input.callId ? commands.get(input.callId) : null;
    if (command && input.failed) failedCommands += 1;
    if (command?.test) recordTestCommandResult(testMetrics, input.output, input.failed);
    if (command && !input.failed) {
      for (const invocation of command.invocations) {
        applyShellFileEvidence(input.cwd, { command: invocation.command, workdir: invocation.workdir, output: input.output }, input.files);
      }
    }
  }

  return {
    get commandsRun() { return commandsRun; },
    get failedCommands() { return failedCommands; },
    get testsRun() { return testMetrics.testsRun; },
    get testsPassed() { return testMetrics.testsPassed; },
    register,
    recordOutput
  };
}

export function createCodexSubagentTracker(): CodexSubagentTracker {
  const pending = new Map<string, { failed: boolean; count: number }>();
  let spawnedWithoutCallId = 0;

  function track(callId: string | null): void {
    if (!callId) {
      spawnedWithoutCallId += 1;
      return;
    }
    const existing = pending.get(callId);
    if (existing) existing.count += 1;
    else pending.set(callId, { failed: false, count: 1 });
  }

  function markOutputFailed(callId: string | null, failed: boolean): void {
    const pendingCall = callId ? pending.get(callId) : null;
    if (pendingCall && failed) pendingCall.failed = true;
  }

  return {
    get spawned() {
      let spawned = spawnedWithoutCallId;
      for (const call of pending.values()) {
        if (!call.failed) spawned += call.count;
      }
      return spawned;
    },
    track,
    markOutputFailed
  };
}
