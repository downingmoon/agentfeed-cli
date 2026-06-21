import { loadCredentials as defaultLoadCredentials } from '../config/credentials.js';
import { loadProjectConfig as defaultLoadProjectConfig } from '../config/project-config.js';
import { resolveCollectionWindowWithDiagnostics as defaultResolveCollectionWindowWithDiagnostics } from '../config/collection-state.js';
import { collectDraftWithStatus as defaultCollectDraftWithStatus, type CollectDraftOptions, type CollectDraftStatus } from '../draft/create.js';
import type { AgentFeedCredentials, AgentType, LocalDraft } from '../types.js';
import { flag } from './args.js';
import { sanitizeDraftForCliOutput as defaultSanitizeDraftForOutput } from './draft-output-sanitizer.js';

type LoadProjectConfig = (cwd: string) => Promise<unknown>;
type LoadCredentials = () => Promise<AgentFeedCredentials | null>;
type ResolveCollectionWindowWithDiagnostics = typeof defaultResolveCollectionWindowWithDiagnostics;
type CollectDraftWithStatus = (options: CollectDraftOptions) => Promise<CollectDraftStatus>;
type SanitizeDraftForOutput = (cwd: string, draft: LocalDraft) => Promise<LocalDraft>;

export type ShareCollectionInput = {
  readonly source?: AgentType;
  readonly sessionFile?: string | null;
  readonly dryRun: boolean;
  readonly note?: string | null;
  readonly runConfiguredCommands: boolean;
};

export type ShareCollectionDependencies = {
  readonly loadProjectConfig?: LoadProjectConfig;
  readonly loadCredentials?: LoadCredentials;
  readonly resolveCollectionWindowWithDiagnostics?: ResolveCollectionWindowWithDiagnostics;
  readonly collectDraftWithStatus?: CollectDraftWithStatus;
  readonly sanitizeDraftForOutput?: SanitizeDraftForOutput;
};

export type ShareCollectionOptions = {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly share: ShareCollectionInput;
  readonly dependencies?: ShareCollectionDependencies;
};

export type ShareCollectionResult = {
  readonly draft: LocalDraft;
  readonly credentials: AgentFeedCredentials | null;
  readonly reusedExistingDraft: boolean;
  readonly warnings: readonly string[];
};
function mutableArgs(args: readonly string[]): string[] {
  return [...args];
}

export async function runShareCollectionCommand(options: ShareCollectionOptions): Promise<ShareCollectionResult> {
  const loadProjectConfig = options.dependencies?.loadProjectConfig ?? defaultLoadProjectConfig;
  const resolveCollectionWindowWithDiagnostics = options.dependencies?.resolveCollectionWindowWithDiagnostics ?? defaultResolveCollectionWindowWithDiagnostics;
  const loadCredentials = options.dependencies?.loadCredentials ?? defaultLoadCredentials;
  const collectDraftWithStatus = options.dependencies?.collectDraftWithStatus ?? defaultCollectDraftWithStatus;
  const sanitizeDraftForOutput = options.dependencies?.sanitizeDraftForOutput ?? defaultSanitizeDraftForOutput;

  await loadProjectConfig(options.cwd);
  const args = mutableArgs(options.args);
  const collectionWindow = await resolveCollectionWindowWithDiagnostics({ cwd: options.cwd, args });
  const credentials = options.share.dryRun ? null : await loadCredentials();
  const collection = await collectDraftWithStatus({
    cwd: options.cwd,
    source: options.share.source,
    sessionFile: options.share.sessionFile ?? null,
    since: collectionWindow.window.since,
    until: collectionWindow.window.until,
    force: flag(args, '--force') || flag(args, '--all'),
    note: options.share.note ?? null,
    runConfiguredCommands: options.share.runConfiguredCommands,
    skipConfiguredCommands: options.share.dryRun
  });
  const draft = await sanitizeDraftForOutput(options.cwd, collection.draft);
  return {
    draft,
    credentials,
    reusedExistingDraft: collection.reusedExisting,
    warnings: [...collectionWindow.warnings, ...collection.warnings]
  };
}
