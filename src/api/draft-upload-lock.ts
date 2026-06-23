import { randomUUID } from 'node:crypto';
import { open, readFile, rm, stat, utimes, type FileHandle } from 'node:fs/promises';
import { resolveProjectRoot } from '../config/project-config.js';
import { draftPaths } from '../draft/paths.js';
import { shortHash } from '../utils/hash.js';
import { DRAFT_UPLOAD_LOCK_STALE_MS, draftUploadLockDiagnostics, draftUploadLockedMessage } from './draft-upload-lock-diagnostics.js';
import { AgentFeedApiError } from './errors.js';

const DEFAULT_DRAFT_UPLOAD_LOCK_TIMEOUT_MS = 60_000;
const DRAFT_UPLOAD_LOCK_POLL_MS = 25;
const DEFAULT_DRAFT_UPLOAD_LOCK_HEARTBEAT_MS = Math.max(1_000, Math.floor(DRAFT_UPLOAD_LOCK_STALE_MS / 4));

export interface DraftUploadLock {
  readonly release: () => Promise<void>;
  readonly assertHeartbeatHealthy: () => void;
}

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
