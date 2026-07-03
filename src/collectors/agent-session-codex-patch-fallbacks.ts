import type { ChangedFileSummary } from '../types.js';
import { applyCodexPatchText } from './agent-session-codex-patch.js';

type CodexPatchFallback = {
  readonly callId: string | null;
  readonly patchText: string;
  failed: boolean;
  confirmed: boolean;
};

type RegisterCodexPatchFallbackOptions = {
  readonly requiresOutput?: boolean;
};

export type CodexPatchFallbacks = {
  readonly register: (callId: string | null, patchText: string | null, options?: RegisterCodexPatchFallbackOptions) => void;
  readonly confirm: (callId: string) => void;
  readonly fail: (callId: string) => void;
  readonly applyConfirmed: (cwd: string, files: Map<string, ChangedFileSummary>) => void;
};

export function createCodexPatchFallbacks(): CodexPatchFallbacks {
  const fallbacks: CodexPatchFallback[] = [];
  const failedCallIds = new Set<string>();

  function register(callId: string | null, patchText: string | null, options: RegisterCodexPatchFallbackOptions = {}): void {
    if (!patchText) return;
    fallbacks.push({
      callId,
      patchText,
      failed: Boolean(callId && failedCallIds.has(callId)),
      confirmed: !options.requiresOutput
    });
  }

  function confirm(callId: string): void {
    for (const fallback of fallbacks) {
      if (fallback.callId === callId) fallback.confirmed = true;
    }
  }

  function fail(callId: string): void {
    failedCallIds.add(callId);
    for (const fallback of fallbacks) {
      if (fallback.callId === callId) fallback.failed = true;
    }
  }

  function applyConfirmed(cwd: string, files: Map<string, ChangedFileSummary>): void {
    for (const { patchText, failed, confirmed } of fallbacks) {
      if (failed || !confirmed) continue;
      const fallbackFiles = new Map<string, ChangedFileSummary>();
      applyCodexPatchText(cwd, patchText, fallbackFiles);
      for (const file of fallbackFiles.values()) {
        if (!files.has(file.path)) files.set(file.path, file);
      }
    }
  }

  return { register, confirm, fail, applyConfirmed };
}
