import { loadCredentials as defaultLoadCredentials } from '../config/credentials.js';
import { loadProjectConfig as defaultLoadProjectConfig } from '../config/project-config.js';
import { resolveCollectionWindowWithDiagnostics as defaultResolveCollectionWindowWithDiagnostics } from '../config/collection-state.js';
import { collectDraftWithStatus as defaultCollectDraftWithStatus, type CollectDraftOptions, type CollectDraftStatus } from '../draft/create.js';
import type { AgentFeedCredentials, AgentType, LocalDraft } from '../types.js';
import { flag } from './args.js';
import { sanitizeDraftForCliOutput as defaultSanitizeDraftForOutput } from './draft-output-sanitizer.js';
import { runLocalAiWorklogFlow as defaultRunLocalAiWorklogFlow, type LocalAiWorklogFlow } from './local-ai-worklog-flow.js';

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
  readonly json?: boolean;
};

export type ShareCollectionDependencies = {
  readonly loadProjectConfig?: LoadProjectConfig;
  readonly loadCredentials?: LoadCredentials;
  readonly resolveCollectionWindowWithDiagnostics?: ResolveCollectionWindowWithDiagnostics;
  readonly collectDraftWithStatus?: CollectDraftWithStatus;
  readonly sanitizeDraftForOutput?: SanitizeDraftForOutput;
  readonly runLocalAiWorklogFlow?: LocalAiWorklogFlow;
};

export type ShareCollectionOptions = {
  readonly cwd: string;
  readonly args: readonly string[];
  readonly share: ShareCollectionInput;
  readonly dependencies?: ShareCollectionDependencies;
  readonly interactive?: boolean;
  readonly printLines?: (lines: readonly string[]) => void;
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
  const runLocalAiWorklogFlow = options.dependencies?.runLocalAiWorklogFlow ?? defaultRunLocalAiWorklogFlow;

  await loadProjectConfig(options.cwd);
  const args = mutableArgs(options.args);
  const collectAll = flag(args, '--all');
  const collectionWindow = await resolveCollectionWindowWithDiagnostics({ cwd: options.cwd, args });
  const credentials = options.share.dryRun ? null : await loadCredentials();
  const collection = await collectDraftWithStatus({
    cwd: options.cwd,
    source: options.share.source,
    sessionFile: options.share.sessionFile ?? null,
    since: collectionWindow.window.since,
    until: collectionWindow.window.until,
    force: flag(args, '--force') || collectAll,
    inferIdleGap: !collectAll,
    note: options.share.note ?? null,
    runConfiguredCommands: options.share.runConfiguredCommands,
    skipConfiguredCommands: options.share.dryRun
  });
  let draft = await sanitizeDraftForOutput(options.cwd, collection.draft);
  const warnings = [...collectionWindow.warnings, ...collection.warnings];
  const aiWorklog = await runLocalAiWorklogFlow({
    cwd: options.cwd,
    args,
    draft,
    uploadRequested: Boolean(credentials),
    json: options.share.json ?? false,
    interactive: options.interactive ?? Boolean(process.stdin.isTTY && process.stdout.isTTY),
    printLines: options.printLines ?? (() => undefined)
  });
  draft = aiWorklog.draft;
  warnings.push(...aiWorklog.warnings);
  return {
    draft,
    credentials,
    reusedExistingDraft: collection.reusedExisting,
    warnings
  };
}
