import { rm } from 'node:fs/promises';
import { resolveProjectRoot } from '../config/project-config.js';
import { loadProjectConfig as defaultLoadProjectConfig } from '../config/project-config.js';
import { listDrafts as defaultListDrafts } from '../draft/read.js';
import { draftPaths } from '../draft/paths.js';
import { pathExists as defaultPathExists } from '../utils/fs.js';
import { flag, option } from './args.js';
import { discardCompletePayload, discardConfirmationPayload, renderDiscardCompleteHumanLines, renderDiscardConfirmationHumanLines } from './discard-command.js';
import { draftListJsonOutput, renderDraftListHumanLines } from './draft-list-output.js';
import { buildDraftListRow as defaultBuildDraftListRow } from './draft-list-rows.js';
import { openJsonPayload, renderOpenHumanLines } from './open-command.js';
import { openReviewDraft as defaultOpenReviewDraft } from './open-execution.js';
import { resolveOpenDraft as defaultResolveOpenDraft } from './open-draft-resolver.js';

type Print = (text?: string) => void;
type PrintLines = (lines: readonly string[]) => void;
type ResolveDraftId = (cwd: string, args: string[]) => Promise<string>;
type LoadProjectConfig = typeof defaultLoadProjectConfig;
type ListDrafts = typeof defaultListDrafts;
type BuildDraftListRow = typeof defaultBuildDraftListRow;
type ResolveProjectRoot = typeof resolveProjectRoot;
type PathExists = typeof defaultPathExists;
type RemoveFile = (path: string, options: { readonly force: boolean }) => Promise<void>;
type ResolveOpenDraft = typeof defaultResolveOpenDraft;
type OpenReviewDraft = typeof defaultOpenReviewDraft;

type LocalDraftCommandIo = {
  readonly cwd: string;
  readonly print: Print;
  readonly printLines: PrintLines;
};

export type DraftsCliCommandDependencies = {
  readonly loadProjectConfig?: LoadProjectConfig;
  readonly listDrafts?: ListDrafts;
  readonly buildDraftListRow?: BuildDraftListRow;
};

export type DraftsCliCommandIo = LocalDraftCommandIo & {
  readonly dependencies?: DraftsCliCommandDependencies;
};

export type DiscardCliCommandDependencies = {
  readonly resolveProjectRoot?: ResolveProjectRoot;
  readonly pathExists?: PathExists;
  readonly removeFile?: RemoveFile;
};

export type DiscardCliCommandIo = LocalDraftCommandIo & {
  readonly resolveDraftId: ResolveDraftId;
  readonly dependencies?: DiscardCliCommandDependencies;
};

export type OpenCliCommandDependencies = {
  readonly resolveOpenDraft?: ResolveOpenDraft;
  readonly openReviewDraft?: OpenReviewDraft;
};

export type OpenCliCommandIo = LocalDraftCommandIo & {
  readonly dependencies?: OpenCliCommandDependencies;
};

export async function runDraftsCliCommand(args: string[], io: DraftsCliCommandIo): Promise<void> {
  const loadProjectConfig = io.dependencies?.loadProjectConfig ?? defaultLoadProjectConfig;
  const listDrafts = io.dependencies?.listDrafts ?? defaultListDrafts;
  const buildDraftListRow = io.dependencies?.buildDraftListRow ?? defaultBuildDraftListRow;
  await loadProjectConfig(io.cwd);
  const rows = await Promise.all((await listDrafts(io.cwd)).map((row) => buildDraftListRow(io.cwd, row)));
  if (flag(args, '--json')) {
    io.print(JSON.stringify(draftListJsonOutput(rows), null, 2));
    return;
  }

  io.printLines(renderDraftListHumanLines(rows));
}

export async function runDiscardCliCommand(args: string[], io: DiscardCliCommandIo): Promise<void> {
  const id = await io.resolveDraftId(io.cwd, args);
  const resolveRoot = io.dependencies?.resolveProjectRoot ?? resolveProjectRoot;
  const pathExists = io.dependencies?.pathExists ?? defaultPathExists;
  const removeFile = io.dependencies?.removeFile ?? rm;
  const root = await resolveRoot(io.cwd);
  const { jsonPath, markdownPath } = draftPaths(root, id);
  const hadJson = await pathExists(jsonPath);
  const hadMarkdown = await pathExists(markdownPath);
  if (!hadJson && !hadMarkdown) {
    throw new Error([
      `Draft not found: ${id}`,
      '',
      'Inspect saved drafts:',
      'Run: agentfeed drafts',
      '',
      'Create a fresh draft:',
      'Run: agentfeed collect --explain'
    ].join('\n'));
  }
  if (!flag(args, '--yes') && !flag(args, '-y')) {
    if (flag(args, '--json')) {
      io.print(JSON.stringify(discardConfirmationPayload({ draftId: id, hadJson, hadMarkdown }), null, 2));
      return;
    }
    io.printLines(renderDiscardConfirmationHumanLines({ draftId: id, hadJson, hadMarkdown }));
    return;
  }
  await removeFile(jsonPath, { force: true });
  await removeFile(markdownPath, { force: true });
  if (flag(args, '--json')) {
    io.print(JSON.stringify(discardCompletePayload({ draftId: id, hadJson, hadMarkdown }), null, 2));
    return;
  }
  io.printLines(renderDiscardCompleteHumanLines({ draftId: id, hadJson, hadMarkdown }));
}

export async function runOpenCliCommand(args: string[], io: OpenCliCommandIo): Promise<void> {
  const resolveOpenDraft = io.dependencies?.resolveOpenDraft ?? defaultResolveOpenDraft;
  const openReviewDraft = io.dependencies?.openReviewDraft ?? defaultOpenReviewDraft;
  const draft = await resolveOpenDraft({ cwd: io.cwd, id: option(args, '--id'), latest: flag(args, '--latest') });
  const result = await openReviewDraft({ cwd: io.cwd, draft });
  if (flag(args, '--json')) {
    io.print(JSON.stringify(openJsonPayload({
      draftId: result.draftId,
      reviewUrl: result.reviewUrl,
      opened: result.opened,
      warnings: result.jsonWarnings
    }), null, 2));
    return;
  }
  io.printLines(renderOpenHumanLines({
    draftId: result.draftId,
    reviewUrl: result.reviewUrl,
    opened: result.opened,
    warnings: result.warnings
  }));
}
