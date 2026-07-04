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
  readonly registerTerminalPoll: (callId: string | null, sessionId: string | null) => void;
  readonly recordOutput: (input: CodexCommandOutput) => void;
};

export type CodexSubagentTracker = {
  readonly spawned: number;
  readonly track: (callId: string | null) => void;
  readonly markOutputFailed: (callId: string | null, failed: boolean) => void;
};

export function createCodexCommandTracker(): CodexCommandTracker {
  const commands = new Map<string, CodexCommandRecord>();
  const terminalSessionOwners = new Map<string, string>();
  const terminalPollCallSessions = new Map<string, string>();
  const failedCommandCallIds = new Set<string>();
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

  function registerTerminalPoll(callId: string | null, sessionId: string | null): void {
    if (!callId || !sessionId) return;
    terminalPollCallSessions.set(callId, sessionId);
  }

  function recordOutput(input: CodexCommandOutput): void {
    const outputCommand = commandForOutput(input.callId);
    const command = outputCommand?.command ?? null;
    const runningSessionId = runningTerminalSessionId(input.output);
    if (runningSessionId && outputCommand) terminalSessionOwners.set(runningSessionId, outputCommand.callId);
    if (command && input.failed && outputCommand && !failedCommandCallIds.has(outputCommand.callId)) {
      failedCommands += 1;
      failedCommandCallIds.add(outputCommand.callId);
    }
    if (command?.test) {
      recordTestCommandResult(testMetrics, input.output, input.failed, { skipFallback: Boolean(runningSessionId && !input.failed) });
    }
    if (command && !input.failed) {
      for (const invocation of command.invocations) {
        applyShellFileEvidence(input.cwd, { command: invocation.command, workdir: invocation.workdir, output: input.output }, input.files);
      }
    }
  }

  function commandForOutput(callId: string | null): { readonly callId: string; readonly command: CodexCommandRecord } | null {
    if (!callId) return null;
    const direct = commands.get(callId);
    if (direct) return { callId, command: direct };
    const terminalSessionId = terminalPollCallSessions.get(callId);
    const ownerCallId = terminalSessionId ? terminalSessionOwners.get(terminalSessionId) : null;
    if (!ownerCallId) return null;
    const command = commands.get(ownerCallId);
    return command ? { callId: ownerCallId, command } : null;
  }

  function runningTerminalSessionId(output: string): string | null {
    const match = /Process running with session ID (\d+)/.exec(output);
    return match?.[1] ?? null;
  }

  return {
    get commandsRun() { return commandsRun; },
    get failedCommands() { return failedCommands; },
    get testsRun() { return testMetrics.testsRun; },
    get testsPassed() { return testMetrics.testsPassed; },
    register,
    registerTerminalPoll,
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
