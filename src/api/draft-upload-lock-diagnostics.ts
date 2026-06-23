import { readFile } from 'node:fs/promises';
import { shortHash } from '../utils/hash.js';

export const DRAFT_UPLOAD_LOCK_STALE_MS = 5 * 60_000;

export type DraftUploadLockDiagnostics = {
  readonly draft_id: string;
  readonly lock_path: string;
  readonly waited_ms: number;
  readonly stale_after_ms: number;
  owner_pid?: number;
  schema_version?: number;
  lock_created_at?: string;
  lock_heartbeat_at?: string;
  lock_age_ms?: number;
  heartbeat_age_ms?: number;
  lock_fingerprint?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalIsoString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function elapsedMsSince(value: string | undefined, now: number): number | undefined {
  if (!value) return undefined;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return undefined;
  return Math.max(0, now - timestamp);
}

export async function draftUploadLockDiagnostics(lockPath: string, draftId: string, waitedMs: number): Promise<DraftUploadLockDiagnostics> {
  const diagnostics: DraftUploadLockDiagnostics = {
    draft_id: draftId,
    lock_path: lockPath,
    waited_ms: Math.max(0, Math.floor(waitedMs)),
    stale_after_ms: DRAFT_UPLOAD_LOCK_STALE_MS
  };
  try {
    const contents = await readFile(lockPath, 'utf8');
    const parsed: unknown = JSON.parse(contents);
    if (!isRecord(parsed)) throw new TypeError('Draft upload lock diagnostics file is not a JSON object.');
    const now = Date.now();
    const createdAt = optionalIsoString(parsed.created_at);
    const heartbeatAt = optionalIsoString(parsed.heartbeat_at);
    diagnostics.owner_pid = optionalPositiveNumber(parsed.pid);
    diagnostics.schema_version = optionalPositiveNumber(parsed.schema_version);
    diagnostics.lock_created_at = createdAt;
    diagnostics.lock_heartbeat_at = heartbeatAt;
    diagnostics.lock_age_ms = elapsedMsSince(createdAt, now);
    diagnostics.heartbeat_age_ms = elapsedMsSince(heartbeatAt, now);
    const fingerprintSource = typeof parsed.token_hash === 'string'
      ? parsed.token_hash
      : `${diagnostics.owner_pid ?? 'unknown'}:${createdAt ?? 'unknown'}:${heartbeatAt ?? 'unknown'}`;
    diagnostics.lock_fingerprint = shortHash(`draft-upload-lock-file:${fingerprintSource}`, 12);
  } catch (error) {
    if (error instanceof Error) {
      diagnostics.lock_fingerprint = shortHash(`draft-upload-lock-file:${lockPath}`, 12);
      return diagnostics;
    }
    throw error;
  }
  return diagnostics;
}

export function draftUploadLockedMessage(diagnostics: DraftUploadLockDiagnostics): string {
  const parts = [
    `Another agentfeed process is uploading draft ${diagnostics.draft_id}.`,
    `Waited ${diagnostics.waited_ms}ms for upload lock ${diagnostics.lock_path}.`
  ];
  if (diagnostics.owner_pid) parts.push(`Owner pid: ${diagnostics.owner_pid}.`);
  if (diagnostics.lock_heartbeat_at) parts.push(`Last heartbeat: ${diagnostics.lock_heartbeat_at}.`);
  parts.push('Wait for it to finish, then rerun the same publish/share command.');
  parts.push(`If no agentfeed process is active and the lock is older than ${Math.floor(DRAFT_UPLOAD_LOCK_STALE_MS / 1000)} seconds, remove the lock file and rerun.`);
  return parts.join(' ');
}
