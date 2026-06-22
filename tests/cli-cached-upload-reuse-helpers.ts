import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, vi } from 'vitest';
import type { AgentFeedCredentials } from '../src/types.js';
import { initProject } from '../src/config/project-config.js';
import { draftUploadCredentialBindingHash } from '../src/api/client.js';

export let dir: string;
export let home: string;

const oldHome = process.env.HOME;

export const defaultPublishCredentials = {
  ingestion_token: 'tok',
  api_base_url: 'https://api.agentfeed.dev/v1',
  created_at: 'now'
};

type UploadBindingCredentials = AgentFeedCredentials & {
  readonly token_id?: string | null;
  readonly user?: { readonly id?: string };
};

export function uploadBinding(credentials: UploadBindingCredentials = defaultPublishCredentials) {
  return {
    api_base_url: credentials.api_base_url,
    credential_binding_hash: draftUploadCredentialBindingHash(credentials),
    token_id: credentials.token_id ?? null,
    user_id: credentials.user?.id ?? null,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function readSavedDraft(id: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(join(dir, '.agentfeed', 'drafts', `${id}.json`), 'utf8'));
  if (!isRecord(parsed)) throw new Error('Saved draft JSON must be an object.');
  return parsed;
}

function savedUploadField(saved: Record<string, unknown>, field: string): unknown {
  const upload = saved.upload;
  if (!isRecord(upload)) return undefined;
  return upload[field];
}

export function savedUploadPayloadHash(saved: Record<string, unknown>): unknown {
  return savedUploadField(saved, 'payload_hash');
}

export function savedUploadReviewUrl(saved: Record<string, unknown>): unknown {
  return savedUploadField(saved, 'review_url');
}

export function useCachedUploadReuseContractEnvironment(): void {
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'agentfeed-upload-cache-'));
    home = await mkdtemp(join(tmpdir(), 'agentfeed-home-'));
    process.env.HOME = home;
    await initProject({ cwd: dir, noGitCheck: true });
  });

  afterEach(async () => {
    process.env.HOME = oldHome;
    vi.unstubAllGlobals();
    await rm(dir, { recursive: true, force: true });
    await rm(home, { recursive: true, force: true });
  });
}
