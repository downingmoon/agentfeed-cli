import { loadCredentials as defaultLoadCredentials } from '../config/credentials.js';
import { markCollectionComplete as defaultMarkCollectionComplete, resolveCollectionWindowWithDiagnostics as defaultResolveCollectionWindowWithDiagnostics } from '../config/collection-state.js';
import { loadProjectConfig as defaultLoadProjectConfig } from '../config/project-config.js';
import { collectDraftWithStatus as defaultCollectDraftWithStatus } from '../draft/create.js';
import type { AgentFeedCredentials, LocalDraft } from '../types.js';
import { flag, option } from './args.js';
import { missingTokenMessage } from './auth-token-input.js';
import { collectJsonPayload, renderCollectAutoUploadIgnoredWarningLines, renderCollectHumanLines } from './collect-output.js';
import { runCollectJsonUploadCommand as defaultRunCollectJsonUploadCommand } from './collect-upload-execution.js';
import { sanitizeDraftForCliOutput as defaultSanitizeDraftForOutput } from './draft-output-sanitizer.js';
import { parseAgentSource } from './source.js';

type Print = (text?: string) => void;
type PrintLines = (lines: readonly string[]) => void;
type Publish = (args: string[]) => Promise<void>;
type LoadProjectConfig = typeof defaultLoadProjectConfig;
type ResolveCollectionWindowWithDiagnostics = typeof defaultResolveCollectionWindowWithDiagnostics;
type LoadCredentials = typeof defaultLoadCredentials;
type CollectDraftWithStatus = typeof defaultCollectDraftWithStatus;
type SanitizeDraftForOutput = typeof defaultSanitizeDraftForOutput;
type RunCollectJsonUploadCommand = typeof defaultRunCollectJsonUploadCommand;
type MarkCollectionComplete = typeof defaultMarkCollectionComplete;

export type CollectCliCommandDependencies = {
  readonly loadProjectConfig?: LoadProjectConfig;
  readonly resolveCollectionWindowWithDiagnostics?: ResolveCollectionWindowWithDiagnostics;
  readonly loadCredentials?: LoadCredentials;
  readonly collectDraftWithStatus?: CollectDraftWithStatus;
  readonly sanitizeDraftForOutput?: SanitizeDraftForOutput;
  readonly runCollectJsonUploadCommand?: RunCollectJsonUploadCommand;
  readonly markCollectionComplete?: MarkCollectionComplete;
};

export type CollectCliCommandIo = {
  readonly cwd: string;
  readonly print: Print;
  readonly printLines: PrintLines;
  readonly publish: Publish;
  readonly dependencies?: CollectCliCommandDependencies;
};

function collectPublishArgs(args: string[], draft: LocalDraft): string[] {
  return [
    '--id',
    draft.id,
    '--yes',
    ...(flag(args, '--open-review') ? ['--open-review'] : []),
    ...(flag(args, '--no-open-review') ? ['--no-open-review'] : [])
  ];
}

async function collectUploadCredentials(args: string[], loadCredentials: LoadCredentials): Promise<AgentFeedCredentials | null> {
  if (!flag(args, '--upload')) return null;
  const credentials = await loadCredentials();
  if (!credentials) throw new Error(missingTokenMessage());
  return credentials;
}

export async function runCollectCliCommand(args: string[], io: CollectCliCommandIo): Promise<void> {
  const loadProjectConfig = io.dependencies?.loadProjectConfig ?? defaultLoadProjectConfig;
  const resolveCollectionWindowWithDiagnostics = io.dependencies?.resolveCollectionWindowWithDiagnostics ?? defaultResolveCollectionWindowWithDiagnostics;
  const loadCredentials = io.dependencies?.loadCredentials ?? defaultLoadCredentials;
  const collectDraftWithStatus = io.dependencies?.collectDraftWithStatus ?? defaultCollectDraftWithStatus;
  const sanitizeDraftForOutput = io.dependencies?.sanitizeDraftForOutput ?? defaultSanitizeDraftForOutput;
  const runCollectJsonUploadCommand = io.dependencies?.runCollectJsonUploadCommand ?? defaultRunCollectJsonUploadCommand;
  const markCollectionComplete = io.dependencies?.markCollectionComplete ?? defaultMarkCollectionComplete;
  const source = parseAgentSource(option(args, '--source'), 'collect');
  const config = await loadProjectConfig(io.cwd);
  const collectionWindow = await resolveCollectionWindowWithDiagnostics({ cwd: io.cwd, args });
  const window = collectionWindow.window;
  const uploadCredentials = await collectUploadCredentials(args, loadCredentials);
  const collection = await collectDraftWithStatus({
    cwd: io.cwd,
    source,
    sessionFile: option(args, '--session-file') ?? null,
    since: window.since,
    until: window.until,
    force: flag(args, '--force') || flag(args, '--all'),
    runConfiguredCommands: flag(args, '--run-configured-commands')
  });
  let draft = await sanitizeDraftForOutput(io.cwd, collection.draft);
  const warnings = [...collectionWindow.warnings, ...collection.warnings];

  if (flag(args, '--json')) {
    if (uploadCredentials) {
      draft = await runCollectJsonUploadCommand({
        cwd: io.cwd,
        draft,
        credentials: uploadCredentials,
        openReview: flag(args, '--open-review'),
        dependencies: { sanitizeDraftForOutput }
      });
    }
    if (!flag(args, '--no-save-cursor')) await markCollectionComplete(io.cwd, draft.source.collection_window, new Date(draft.source.created_at));
    io.print(JSON.stringify(collectJsonPayload({ draft, warnings }), null, 2));
    return;
  }

  io.printLines(renderCollectHumanLines({
    draft,
    warnings,
    reusedExisting: collection.reusedExisting,
    dryRun: flag(args, '--dry') || flag(args, '--dry-run'),
    explain: flag(args, '--explain')
  }));
  if (flag(args, '--upload')) {
    await io.publish(collectPublishArgs(args, draft));
  } else if (!flag(args, '--no-upload') && config.collection.auto_upload) {
    io.printLines(renderCollectAutoUploadIgnoredWarningLines());
  }
  if (!flag(args, '--no-save-cursor')) await markCollectionComplete(io.cwd, draft.source.collection_window, new Date(draft.source.created_at));
}
