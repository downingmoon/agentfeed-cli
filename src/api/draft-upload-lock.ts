import { randomUUID } from 'node:crypto';
import { open, readFile, rm, stat, utimes, type FileHandle } from 'node:fs/promises';
import { resolveProjectRoot } from '../config/project-config.js';
import { draftPaths } from '../draft/paths.js';
import { shortHash } from '../utils/hash.js';
import { AgentFeedApiError } from './errors.js';

const DEFAULT_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = 60_000;
const DRAFT_UPLOAD_LOCK_POLL_MS = 25;
const DRAFT_UPLOAD_LOCK_STALE_MS = 5 * 60_000;
const DEFAULT_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = Math.max(1_000, Math.floor(DRAFT_UPLOAD_LOCK_STALE_MS / 4));

export interface DraftUploadLock {
  readonly release: () => Promise<void>;
  readonly assertHeartbeatHealthy: () => void;
}

type DraftUploadLockDiagnostics = {
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

function draftUploadLockTimeoutMs(): number {
  const configured = Number(process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_DRAFT_UPLOAD_LOCK_TIMEOUT_MS;
}

function draftUploadLockHeartbeatMs(): number {
  const configured = Number(process.env.AGENTFEED_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS);
  if (Number.isFinite(configured) && configured > 0) return Math.max(10, Math.floor(configured));
  return DEFAULT_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function errorCode(error: unknown): string {
  if (isRecord(error)) {
    const code = error.code;
    return typeof code === 'string' ? code : '';
  }
  return '';
}

async function removeStaleDraftUploadLock(lockPath: string): Promise<void> {
  let lockStat: Awaited<ReturnType<typeof stat>>;
  try {
    lockStat = await stat(lockPath);
  } catch (error) {
    if (error instanceof Error) return;
    throw error;
  }
  if (Date.now() - lockStat.mtimeMs <= DRAFT_UPLOAD_LOCK_STALE_MS) return;
  await rm(lockPath, { force: true }).catch(() => undefined);
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

async function draftUploadLockDiagnostics(lockPath: string, draftId: string, waitedMs: number): Promise<DraftUploadLockDiagnostics> {
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

function draftUploadLockedMessage(diagnostics: DraftUploadLockDiagnostics): string {
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

function draftUploadLockTokenHash(token: string): string {
  return shortHash(`draft-upload-lock:${token}`, 32);
}

async function createDraftUploadLockFile(lockPath: string, token: string): Promise<FileHandle> {
  const handle = await open(lockPath, 'wx', 0o600);
  try {
    const now = new Date().toISOString();
    await handle.writeFile(`${JSON.stringify({
      schema_version: 2,
      pid: process.pid,
      token_hash: draftUploadLockTokenHash(token),
      created_at: now,
      heartbeat_at: now
    })}\n`, 'utf8');
    return handle;
  } catch (error) {
    await handle.close().catch(() => undefined);
    await rm(lockPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

function draftUploadLockHeartbeatFailedError(error: unknown): AgentFeedApiError {
  const reason = error instanceof Error && error.message ? error.message : 'unknown filesystem error';
  return new AgentFeedApiError(
    423,
    'DRAFT_UPLOAD_LOCK_HEARTBEAT_FAILED',
    `Draft upload lock heartbeat failed. Local draft metadata was kept unchanged; rerun the same publish/share command to reconcile any server-side duplicate. ${reason}`
  );
}

function startDraftUploadLockHeartbeat(lockPath: string): { readonly stop: () => void; readonly assertHealthy: () => void } {
  const heartbeatMs = draftUploadLockHeartbeatMs();
  let heartbeatFailure: unknown;
  const heartbeat = setInterval(() => {
    const now = new Date();
    void utimes(lockPath, now, now).catch(error => {
      heartbeatFailure ??= error;
    });
  }, heartbeatMs);
  heartbeat.unref?.();
  return {
    stop: () => clearInterval(heartbeat),
    assertHealthy: () => {
      if (heartbeatFailure) throw draftUploadLockHeartbeatFailedError(heartbeatFailure);
    }
  };
}

export async function acquireDraftUploadLock(cwd: string, id: string): Promise<DraftUploadLock> {
  const root = await resolveProjectRoot(cwd);
  const { jsonPath } = draftPaths(root, id);
  const lockPath = `${jsonPath}.upload.lock`;
  const startedAt = Date.now();
  const timeoutMs = draftUploadLockTimeoutMs();
  const deadline = startedAt + timeoutMs;
  const token = randomUUID();
  let removedStaleLock = false;

  while (true) {
    try {
      const handle = await createDraftUploadLockFile(lockPath, token);
      const heartbeat = startDraftUploadLockHeartbeat(lockPath);
      let released = false;
      return {
        assertHeartbeatHealthy: heartbeat.assertHealthy,
        release: async () => {
          if (released) return;
          released = true;
          heartbeat.stop();
          await handle.close().catch(() => undefined);
          try {
            const lockContents = await readFile(lockPath, 'utf8');
            const parsed: unknown = JSON.parse(lockContents);
            if (isRecord(parsed) && parsed.token_hash === draftUploadLockTokenHash(token)) await rm(lockPath, { force: true });
          } catch (error) {
            if (error instanceof Error) {
              // If the lock file is already gone or corrupted, never delete a replacement lock.
              return;
            }
            throw error;
          }
        }
      };
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error;
      if (!removedStaleLock) {
        removedStaleLock = true;
        await removeStaleDraftUploadLock(lockPath);
        continue;
      }
      if (Date.now() >= deadline) {
        const diagnostics = await draftUploadLockDiagnostics(lockPath, id, Date.now() - startedAt);
        throw new AgentFeedApiError(
          423,
          'DRAFT_UPLOAD_LOCKED',
          draftUploadLockedMessage(diagnostics),
          diagnostics
        );
      }
      await sleep(Math.min(DRAFT_UPLOAD_LOCK_POLL_MS, Math.max(1, deadline - Date.now())));
    }
  }
}
