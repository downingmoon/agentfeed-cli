import { formatCollectionExplain } from '../draft/explain.js';
import { loadCredentialsWithMetadata as defaultLoadCredentialsWithMetadata } from '../config/credentials.js';
import { flag } from './args.js';
import { formatWarningLines } from './diagnostic-formatters.js';
import { renderShareLocalNextLines, shareLocalJsonPayload, shareUploadedJsonPayload } from './share-output.js';
import { runShareCollectionCommand as defaultRunShareCollectionCommand } from './share-collection-execution.js';
import { runShareUploadCommand as defaultRunShareUploadCommand } from './share-upload-execution.js';
import { formatSharePreview, parseShareArgs } from './share.js';
import { renderUploadConfirmationRequiredLines, renderUploadResultLines } from './upload-output.js';
import * as ui from './ui.js';

type Print = (text?: string) => void;
type PrintLines = (lines: readonly string[]) => void;
type LoadCredentialsWithMetadata = typeof defaultLoadCredentialsWithMetadata;
type RunShareCollectionCommand = typeof defaultRunShareCollectionCommand;
type RunShareUploadCommand = typeof defaultRunShareUploadCommand;

export type ShareCliCommandDependencies = {
  readonly loadCredentialsWithMetadata?: LoadCredentialsWithMetadata;
  readonly runShareCollectionCommand?: RunShareCollectionCommand;
  readonly runShareUploadCommand?: RunShareUploadCommand;
};

export type ShareCliCommandIo = {
  readonly cwd: string;
  readonly print: Print;
  readonly printLines: PrintLines;
  readonly dependencies?: ShareCliCommandDependencies;
  readonly interactive?: boolean;
};

async function hasCredentialsForPublishGuidance(io: ShareCliCommandIo): Promise<boolean> {
  const loadCredentialsWithMetadata = io.dependencies?.loadCredentialsWithMetadata ?? defaultLoadCredentialsWithMetadata;
  try {
    return Boolean((await loadCredentialsWithMetadata({ cwd: io.cwd })).credentials);
  } catch {
    return false;
  }
}

function printWarningLines(warnings: readonly string[], print: Print): void {
  for (const warning of warnings) {
    for (const line of formatWarningLines(warning)) print(line);
  }
}

export async function runShareCliCommand(args: string[], io: ShareCliCommandIo): Promise<void> {
  const opts = parseShareArgs(args);
  const runShareCollectionCommand = io.dependencies?.runShareCollectionCommand ?? defaultRunShareCollectionCommand;
  const runShareUploadCommand = io.dependencies?.runShareUploadCommand ?? defaultRunShareUploadCommand;
  const collection = await runShareCollectionCommand({ cwd: io.cwd, args, share: opts, interactive: io.interactive, printLines: io.printLines });
  const draft = collection.draft;
  const creds = collection.credentials;
  const warnings = collection.warnings;

  if (opts.json) {
    if (opts.dryRun || !creds) {
      const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance(io);
      io.print(JSON.stringify(shareLocalJsonPayload({
        dryRun: opts.dryRun,
        hasCredentials,
        reusedExistingDraft: collection.reusedExistingDraft,
        draft,
        warnings,
        explain: opts.explain
      }), null, 2));
      return;
    }
    const upload = await runShareUploadCommand({
      cwd: io.cwd,
      draft,
      credentials: creds,
      flags: {
        json: true,
        yes: opts.yes,
        clipboard: flag(args, '--clipboard'),
        noClipboard: opts.noClipboard,
        openReview: opts.openReview,
        noOpenReview: opts.noOpenReview,
        noSaveCursor: opts.noSaveCursor
      }
    });
    if (upload.kind === 'confirmation_required') throw new Error('Internal error: JSON share upload should not require confirmation.');
    io.print(JSON.stringify(shareUploadedJsonPayload({
      reusedExistingDraft: collection.reusedExistingDraft,
      draft: upload.draft,
      upload: upload.upload,
      handoff: upload.handoff,
      warnings,
      explain: opts.explain
    }), null, 2));
    return;
  }

  if (collection.reusedExistingDraft) io.print(`Reusing existing matching draft: ${draft.id}\n`);
  if (warnings.length) {
    io.print(ui.section('Warnings'));
    printWarningLines(warnings, io.print);
    io.print();
  }
  io.print(formatSharePreview(draft, { explainDetailsFollow: opts.explain }));
  io.print();
  if (opts.explain) {
    io.print(ui.section('Collection details'));
    io.print(formatCollectionExplain(draft));
    io.print();
  }

  if (opts.dryRun || !creds) {
    const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance(io);
    io.printLines(renderShareLocalNextLines({ dryRun: opts.dryRun, draftId: draft.id, hasCredentials }));
    return;
  }

  const upload = await runShareUploadCommand({
    cwd: io.cwd,
    draft,
    credentials: creds,
    flags: {
      json: false,
      yes: opts.yes,
      clipboard: flag(args, '--clipboard'),
      noClipboard: opts.noClipboard,
      openReview: opts.openReview,
      noOpenReview: opts.noOpenReview,
      noSaveCursor: opts.noSaveCursor
    }
  });
  if (upload.kind === 'confirmation_required') {
    io.printLines(renderUploadConfirmationRequiredLines(upload.draft, upload.command, upload.extraCommand));
    return;
  }
  io.printLines(renderUploadResultLines({
    heading: upload.upload.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: upload.upload.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.',
    draftId: upload.draft.id,
    result: upload.upload,
    handoff: upload.handoff
  }));
}
