#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { initProject, loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { deleteSavedCredentials, loadCredentials, loadCredentialsWithMetadata } from '../config/credentials.js';
import { markCollectionComplete, readCollectionStateWithDiagnostics, resolveCollectionWindowWithDiagnostics } from '../config/collection-state.js';
import { collectDraft, collectDraftWithStatus } from '../draft/create.js';
import { findLatestDraft, listDrafts, readLatestDraft } from '../draft/read.js';
import { formatCollectionExplain } from '../draft/explain.js';
import type { AgentFeedCredentials, LocalDraft } from '../types.js';
import { collectGitMetrics } from '../collectors/git.js';
import { installClaudeCodeHook, uninstallClaudeCodeHook } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { unknownCommandError } from './unknown-command-error.js';
import { resolveStatusProject } from './status-project.js';
import { missingTokenMessage } from './auth-token-input.js';
import { requireApiCompatibilityBeforeUpload } from './upload-preflight.js';
import { collectJsonNextActions } from './draft-next-actions.js';
import { commandCatalogNextActions } from './guidance-actions.js';
import { renderGuidedNextCommandLines, renderNextCommandLines, renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import { jsonErrorFromMessage } from './error-output.js';
import { commandHelpHint, hookUsageMessage, unsupportedHookTargetMessage } from './command-recovery.js';
import { leadingOptionError } from './leading-option-error.js';
import { hasHelpFlag } from './help-flag.js';
import { isTrailingHelpAlias } from './trailing-help-alias.js';
import { createCompletionVocabulary } from './completion-vocabulary.js';
import { createCompletionOptionMetadata } from './completion-option-metadata.js';
import { createCompletionScriptRenderer } from './completion-script-renderer.js';
import { completionCommandResult, unexpectedCompletionCommandResult } from './completion-command.js';
import { versionCommandOutput } from './version-command.js';
import { discardCompletePayload, discardConfirmationPayload, renderDiscardCompleteHumanLines, renderDiscardConfirmationHumanLines } from './discard-command.js';
import { openJsonPayload, renderOpenHumanLines } from './open-command.js';
import { openReviewDraft } from './open-execution.js';
import { resolveOpenDraft } from './open-draft-resolver.js';
import { localPreviewJsonPayload, remotePreviewJsonPayload, renderLocalPreviewHumanLines, renderRemotePreviewHumanLines } from './preview-command.js';
import { runPreviewCommand } from './preview-execution.js';
import { formatPrivacyScanReport, privacyScanJsonOutput } from './privacy-scan-output.js';
import { runPrivacyScanCommand } from './scan-command.js';
import { draftListJsonOutput, renderDraftListHumanLines } from './draft-list-output.js';
import { buildDraftListRow } from './draft-list-rows.js';
import { formatWarningLines, readinessMarker } from './diagnostic-formatters.js';
import { collectJsonPayload, renderCollectAutoUploadIgnoredWarningLines, renderCollectHumanLines } from './collect-output.js';
import { logoutJsonPayload, renderLogoutHumanLines } from './logout-output.js';
import { initJsonPayload, renderInitHumanLines } from './init-output.js';
import { hookJsonPayload, renderHookHumanLines, type HookInstallOutputInput, type HookUninstallOutputInput } from './hook-output.js';
import { runLoginCommand } from './login-command.js';
import { runRotateCommand } from './rotate-command.js';
import { runStatusCommand } from './status-command.js';
import { runDoctorCommand } from './doctor-command.js';
import { renderUploadConfirmationRequiredLines, renderUploadResultLines } from './upload-output.js';
import { renderShareLocalNextLines, shareLocalJsonPayload, shareUploadedJsonPayload } from './share-output.js';
import { runShareCollectionCommand } from './share-collection-execution.js';
import { runShareUploadCommand } from './share-upload-execution.js';
import { runCollectJsonUploadCommand } from './collect-upload-execution.js';
import { sanitizeDraftForCliOutput } from './draft-output-sanitizer.js';
import { publishJsonPayload, renderPublishUploadResultLines } from './publish-output.js';
import { runPublishCommand } from './publish-execution.js';
import { createCommandCatalog } from './command-catalog.js';
import { buildCommandsJsonPayload, renderCommandsHumanLines } from './commands-output-renderer.js';
import { COMMAND_WORKFLOWS, renderCommandCatalogLines, renderCommandWorkflowLines } from './command-catalog-renderer.js';
import { COMMAND_DESCRIPTIONS, COMMAND_EXAMPLES, COMMAND_GROUPS, COMMAND_USAGE_OVERRIDES, KNOWN_COMMANDS, PUBLIC_COMMANDS } from './command-definitions.js';
import { COMMAND_ARG_SPECS, SUPPORTED_COMPLETION_SHELLS } from './command-arg-specs.js';
import { validateCommandArgs } from './command-argument-validator.js';
import { commandHelpText } from './command-help-text.js';
import { renderRootHelpLines } from './root-help-renderer.js';
import { formatSharePreview, parseShareArgs } from './share.js';
import { parseAgentSource, SUPPORTED_SOURCES } from './source.js';
import { readJson, pathExists } from '../utils/fs.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { draftPaths } from '../draft/paths.js';
import * as ui from './ui.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function printLines(lines: readonly string[]): void { for (const line of lines) print(line); }
function err(text = '') { process.stderr.write(`${text}\n`); }

function safeTerminalText(value: string | null | undefined): string {
  return ui.sanitizeTerminalText(value ?? '');
}


function printWarningLines(warnings: readonly string[]): void {
  for (const warning of warnings) {
    for (const line of formatWarningLines(warning)) print(line);
  }
}

function jsonModeRequested(argv = process.argv.slice(2)): boolean {
  return argv.some((arg) => arg === '--json');
}



function printNextCommands(commands: string[]): void {
  for (const line of renderNextCommandLines({ commands, command: ui.command })) print(line);
}

function printRecommendedCommands(commands: string[]): void {
  for (const line of renderRecommendedCommandLines({ commands, command: ui.command })) print(line);
}

function printGuidedNextCommands(commands: string[]): void {
  for (const line of renderGuidedNextCommandLines({ commands, command: ui.command })) print(line);
}

async function resolveDraftId(cwd: string, args: string[]): Promise<string> {
  await loadProjectConfig(cwd);
  const id = option(args, '--id');
  if (id) return id;
  const latest = await findLatestDraft(cwd);
  if (!latest) {
    throw new Error([
      'No local drafts found.',
      '',
      'Create a draft:',
      'Run: agentfeed collect --explain',
      'Run: agentfeed share --dry',
      '',
      'Inspect saved drafts:',
      'Run: agentfeed drafts'
    ].join('\n'));
  }
  return latest.id;
}

async function cmdInit(args: string[]) {
  const result = await initProject({
    cwd: process.cwd(),
    projectName: option(args, '--project-name'),
    noGitCheck: flag(args, '--no-git-check'),
    force: flag(args, '--force')
  });
  const initOutput = {
    alreadyInitialized: result.alreadyInitialized,
    project: {
      name: result.config.project.name,
      visibility: result.config.project.visibility,
      tags: result.config.project.tags
    },
    root: result.root,
    backupPaths: result.backupPaths
  };
  if (flag(args, '--json')) {
    print(JSON.stringify(initJsonPayload(initOutput), null, 2));
    return;
  }
  printLines(renderInitHumanLines(initOutput));
}

async function cmdLogin(args: string[]) {
  await runLoginCommand(args, {
    cwd: process.cwd(),
    env: process.env,
    print,
    printLines
  });
}

async function cmdRotate(args: string[]) {
  await runRotateCommand(args, {
    cwd: process.cwd(),
    printLines
  });
}

async function cmdStatus(args: string[] = []) {
  await runStatusCommand(args, {
    cwd: process.cwd(),
    print,
    printLines
  });
}

async function cmdLogout(args: string[]) {
  const result = await deleteSavedCredentials();
  const logoutOutput = { result, envTokenActive: Boolean(process.env.AGENTFEED_TOKEN) };
  if (flag(args, '--json')) {
    print(JSON.stringify(logoutJsonPayload(logoutOutput), null, 2));
    return;
  }
  printLines(renderLogoutHumanLines(logoutOutput));
}

async function cmdCollect(args: string[]) {
  const source = parseAgentSource(option(args, '--source'), 'collect');
  const config = await loadProjectConfig(process.cwd());
  const collectionWindow = await resolveCollectionWindowWithDiagnostics({ cwd: process.cwd(), args });
  const window = collectionWindow.window;
  const uploadRequested = flag(args, '--upload');
  const uploadCredentials = uploadRequested ? await loadCredentials() : null;
  if (uploadRequested && !uploadCredentials) throw new Error(missingTokenMessage());
  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source, sessionFile: option(args, '--session-file') ?? null, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), runConfiguredCommands: flag(args, '--run-configured-commands') });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);
  const warnings = [...collectionWindow.warnings, ...collection.warnings];
  if (flag(args, '--json')) {
    if (uploadRequested && uploadCredentials) {
      draft = await runCollectJsonUploadCommand({
        cwd: process.cwd(),
        draft,
        credentials: uploadCredentials,
        openReview: flag(args, '--open-review'),
        dependencies: { sanitizeDraftForOutput: sanitizeDraftForCliOutput }
      });
    }
    if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    print(JSON.stringify(collectJsonPayload({ draft, warnings }), null, 2));
    return;
  }
  printLines(renderCollectHumanLines({
    draft,
    warnings,
    reusedExisting: collection.reusedExisting,
    dryRun: flag(args, '--dry') || flag(args, '--dry-run'),
    explain: flag(args, '--explain')
  }));
  if (uploadRequested) {
    await cmdPublish(['--id', draft.id, '--yes', ...(flag(args, '--open-review') ? ['--open-review'] : []), ...(flag(args, '--no-open-review') ? ['--no-open-review'] : [])]);
  } else {
    if (!flag(args, '--no-upload') && config.collection.auto_upload) {
      printLines(renderCollectAutoUploadIgnoredWarningLines());
    }
  }
  if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
}

async function cmdShare(args: string[]) {
  const opts = parseShareArgs(args);
  const collection = await runShareCollectionCommand({ cwd: process.cwd(), args, share: opts });
  const draft = collection.draft;
  const creds = collection.credentials;
  const warnings = collection.warnings;

  if (opts.json) {
    if (opts.dryRun || !creds) {
      const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance();
      print(JSON.stringify(shareLocalJsonPayload({
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
      cwd: process.cwd(),
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
    print(JSON.stringify(shareUploadedJsonPayload({
      reusedExistingDraft: collection.reusedExistingDraft,
      draft: upload.draft,
      upload: upload.upload,
      handoff: upload.handoff,
      warnings,
      explain: opts.explain
    }), null, 2));
    return;
  }

  if (collection.reusedExistingDraft) print(`Reusing existing matching draft: ${draft.id}\n`);
  if (warnings.length) {
    print(ui.section('Warnings'));
    printWarningLines(warnings);
    print();
  }
  print(formatSharePreview(draft, { explainDetailsFollow: opts.explain }));
  print();
  if (opts.explain) {
    print(ui.section('Collection details'));
    print(formatCollectionExplain(draft));
    print();
  }

  if (opts.dryRun || !creds) {
    const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance();
    printLines(renderShareLocalNextLines({ dryRun: opts.dryRun, draftId: draft.id, hasCredentials }));
    return;
  }

  const upload = await runShareUploadCommand({
    cwd: process.cwd(),
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
    printLines(renderUploadConfirmationRequiredLines(upload.draft, upload.command, upload.extraCommand));
    return;
  }
  printLines(renderUploadResultLines({
    heading: upload.upload.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: upload.upload.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.',
    draftId: upload.draft.id,
    result: upload.upload,
    handoff: upload.handoff
  }));
}

async function hasCredentialsForPublishGuidance(): Promise<boolean> {
  try {
    return Boolean((await loadCredentialsWithMetadata({ cwd: process.cwd() })).credentials);
  } catch {
    return false;
  }
}

async function cmdPreview(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const preview = await runPreviewCommand({ cwd: process.cwd(), id, remote: flag(args, '--remote') });
  if (preview.kind === 'remote') {
    if (flag(args, '--json')) {
      print(JSON.stringify(remotePreviewJsonPayload({ draftId: preview.draft.id, remote: preview.remote }), null, 2));
    } else {
      printLines(renderRemotePreviewHumanLines({ draftId: preview.draft.id, draftTitle: preview.draft.worklog.title, remote: preview.remote }));
    }
    return;
  }
  if (flag(args, '--json')) { print(JSON.stringify(localPreviewJsonPayload(preview.draft), null, 2)); return; }
  printLines(renderLocalPreviewHumanLines(preview.draft));
}

async function cmdPublish(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const result = await runPublishCommand({
    cwd: process.cwd(),
    id,
    flags: {
      json: flag(args, '--json'),
      yes: flag(args, '--yes') || flag(args, '-y'),
      clipboard: flag(args, '--clipboard'),
      noClipboard: flag(args, '--no-clipboard'),
      openReview: flag(args, '--open-review'),
      noOpenReview: flag(args, '--no-open-review')
    }
  });
  if (result.kind === 'confirmation_required') {
    printLines(renderUploadConfirmationRequiredLines(result.draft, result.command, undefined, result.cacheReuseReason ? { cacheReuseReason: result.cacheReuseReason } : {}));
    return;
  }
  if (flag(args, '--json')) {
    print(JSON.stringify(publishJsonPayload({ draft: result.draft, upload: result.upload, handoff: result.handoff }), null, 2));
    return;
  }
  printLines(renderPublishUploadResultLines({ draft: result.draft, upload: result.upload, handoff: result.handoff }));
}

async function cmdScan(args: string[]) {
  const dryRun = flag(args, '--dry-run') || flag(args, '--dry');
  const scanPath = option(args, '--path');
  const id = scanPath ? undefined : await resolveDraftId(process.cwd(), args);
  const scan = await runPrivacyScanCommand({ cwd: process.cwd(), dryRun, path: scanPath ?? undefined, draftId: id });
  print(flag(args, '--json')
    ? JSON.stringify(privacyScanJsonOutput(scan.input, scan.result, scan.options), null, 2)
    : formatPrivacyScanReport(scan.input, scan.result.redacted, scan.result.scan, scan.options));
}

async function cmdHook(args: string[]) {
  const action = args[0];
  const target = args[1];
  if (target !== 'claude-code') throw new Error(unsupportedHookTargetMessage());
  const root = await resolveProjectRoot(process.cwd());
  const scope = flag(args, '--global') ? 'global' : 'project';
  const settingsPath = option(args, '--settings-path');
  if (action === 'install') {
    await loadProjectConfig(process.cwd());
    const dryRun = flag(args, '--dry-run');
    const result = await installClaudeCodeHook({ projectRoot: root, scope, settingsPath, dryRun });
    const hookOutput = {
      action: 'install',
      scope,
      dryRun,
      settingsPath: result.path,
      backupPath: result.backupPath ?? null
    } satisfies HookInstallOutputInput;
    if (flag(args, '--json')) {
      print(JSON.stringify(hookJsonPayload(hookOutput), null, 2));
      return;
    }
    printLines(renderHookHumanLines(hookOutput));
  } else if (action === 'uninstall') {
    const result = await uninstallClaudeCodeHook({ projectRoot: root, scope, settingsPath });
    const hookOutput = {
      action: 'uninstall',
      scope,
      settingsPath: result.path,
      backupPath: result.backupPath ?? null
    } satisfies HookUninstallOutputInput;
    if (flag(args, '--json')) {
      print(JSON.stringify(hookJsonPayload(hookOutput), null, 2));
      return;
    }
    printLines(renderHookHumanLines(hookOutput));
  } else throw new Error(hookUsageMessage());
}

async function cmdDoctor(args: string[] = []) {
  await runDoctorCommand(args, {
    cwd: process.cwd(),
    nodeVersion: process.versions.node,
    print,
    printLines
  });
}

async function cmdDrafts(args: string[]) {
  await loadProjectConfig(process.cwd());
  const cwd = process.cwd();
  const rows = await Promise.all((await listDrafts(cwd)).map((row) => buildDraftListRow(cwd, row)));
  if (flag(args, '--json')) {
    print(JSON.stringify(draftListJsonOutput(rows), null, 2));
    return;
  }

  printLines(renderDraftListHumanLines(rows));
}

async function cmdDiscard(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const root = await resolveProjectRoot(process.cwd());
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
      print(JSON.stringify(discardConfirmationPayload({ draftId: id, hadJson, hadMarkdown }), null, 2));
      return;
    }
    printLines(renderDiscardConfirmationHumanLines({ draftId: id, hadJson, hadMarkdown }));
    return;
  }
  await rm(jsonPath, { force: true });
  await rm(markdownPath, { force: true });
  if (flag(args, '--json')) {
    print(JSON.stringify(discardCompletePayload({ draftId: id, hadJson, hadMarkdown }), null, 2));
    return;
  }
  printLines(renderDiscardCompleteHumanLines({ draftId: id, hadJson, hadMarkdown }));
}

async function cmdOpen(args: string[]) {
  const draft = await resolveOpenDraft({ cwd: process.cwd(), id: option(args, '--id'), latest: flag(args, '--latest') });
  const result = await openReviewDraft({ cwd: process.cwd(), draft });
  if (flag(args, '--json')) {
    print(JSON.stringify(openJsonPayload({
      draftId: result.draftId,
      reviewUrl: result.reviewUrl,
      opened: result.opened,
      warnings: result.jsonWarnings
    }), null, 2));
    return;
  }
  printLines(renderOpenHumanLines({
    draftId: result.draftId,
    reviewUrl: result.reviewUrl,
    opened: result.opened,
    warnings: result.warnings
  }));
}


async function cmdCompletion(args: string[]) {
  const result = completionCommandResult({
    args,
    scriptFor: (shell) => COMPLETION_SCRIPT_RENDERER.scriptFor(shell),
    supportedShells: SUPPORTED_COMPLETION_SHELLS
  });
  switch (result.kind) {
    case 'help': return printCommandHelp(result.command);
    case 'script': return print(result.script);
    default: return unexpectedCompletionCommandResult(result);
  }
}

async function cmdVersion(args: string[]) {
  print(versionCommandOutput({ args, version: AGENTFEED_CLI_VERSION }));
}

function commandWorkflowLines(): string[] {
  return renderCommandWorkflowLines({
    workflows: COMMAND_WORKFLOWS,
    section: ui.section,
    command: ui.command
  });
}

async function cmdCommands(args: string[]) {
  const nextActions = commandCatalogNextActions();
  if (flag(args, '--json')) {
    print(JSON.stringify(buildCommandsJsonPayload({
      nextActions,
      workflows: COMMAND_WORKFLOWS,
      groups: COMMAND_GROUPS,
      descriptions: COMMAND_DESCRIPTIONS,
      examples: COMMAND_EXAMPLES,
      usageOverrides: COMMAND_USAGE_OVERRIDES,
      catalog: COMMAND_CATALOG
    }), null, 2));
    return;
  }
  for (const line of renderCommandsHumanLines({
    heading: ui.heading,
    section: ui.section,
    command: ui.command,
    commandCatalogLines: commandCatalogLines(),
    workflowLines: commandWorkflowLines(),
    nextActionLines: renderGuidedNextCommandLines({ commands: nextActions, command: ui.command })
  })) print(line);
}

const COMPLETION_VOCABULARY = createCompletionVocabulary({
  commandSpecs: COMMAND_ARG_SPECS,
  publicCommands: PUBLIC_COMMANDS,
  completionShells: SUPPORTED_COMPLETION_SHELLS
});
const COMPLETION_OPTION_METADATA = createCompletionOptionMetadata({
  commandSpecs: COMMAND_ARG_SPECS,
  valueChoices: {
    '--source': SUPPORTED_SOURCES,
    '--token': ['-']
  }
});
const COMPLETION_SCRIPT_RENDERER = createCompletionScriptRenderer({
  commands: PUBLIC_COMMANDS.map((command) => ({ name: command, description: COMMAND_DESCRIPTIONS[command] })),
  sourceValues: SUPPORTED_SOURCES,
  vocabulary: COMPLETION_VOCABULARY,
  optionMetadata: COMPLETION_OPTION_METADATA
});
const COMMAND_CATALOG = createCommandCatalog({
  commandSpecs: COMMAND_ARG_SPECS,
  vocabulary: COMPLETION_VOCABULARY,
  optionMetadata: COMPLETION_OPTION_METADATA
});

function commandCatalogLines(): string[] {
  return renderCommandCatalogLines({
    groups: COMMAND_GROUPS,
    descriptions: COMMAND_DESCRIPTIONS,
    section: ui.section,
    command: ui.command
  });
}

function printHelp(): void {
  for (const line of renderRootHelpLines({
    version: AGENTFEED_CLI_VERSION,
    heading: ui.heading,
    section: ui.section,
    command: ui.command,
    commandCatalogLines: commandCatalogLines()
  })) print(line);
}

function printCommandHelp(command: string): void {
  print(commandHelpText(command));
}

function printHelpTopic(args: string[]): void {
  if (args.length === 0) {
    printHelp();
    return;
  }
  if (args[0] === 'token') {
    printCommandHelp('token');
    return;
  }
  printCommandHelp(args[0]);
}
async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command.startsWith('-') && command !== '--version' && command !== '-v') {
    throw leadingOptionError({ option: command, args, knownCommands: KNOWN_COMMANDS, commandSpecs: COMMAND_ARG_SPECS });
  }
  if (hasHelpFlag(args)) {
    if (!KNOWN_COMMANDS.has(command)) throw unknownCommandError({ command, knownCommands: PUBLIC_COMMANDS });
    printCommandHelp(command);
    return;
  }
  if (command === 'help') {
    validateCommandArgs(command, args);
    printHelpTopic(args);
    return;
  }
  if (isTrailingHelpAlias({ command, args })) {
    if (!KNOWN_COMMANDS.has(command)) throw unknownCommandError({ command, knownCommands: PUBLIC_COMMANDS });
    printCommandHelp(command);
    return;
  }
  if (KNOWN_COMMANDS.has(command)) validateCommandArgs(command, args);
  switch (command) {
    case 'init': return cmdInit(args);
    case 'login': return cmdLogin(args);
    case 'logout': return cmdLogout(args);
    case 'status': return cmdStatus(args);
    case 'rotate': return cmdRotate(args);
    case 'token':
      if (args[0] === 'rotate') return cmdRotate(args.slice(1));
      throw new Error('Usage: agentfeed token rotate');
    case 'collect': return cmdCollect(args);
    case 'share': return cmdShare(args);
    case 'preview': return cmdPreview(args);
    case 'publish': return cmdPublish(args);
    case 'scan': return cmdScan(args);
    case 'hook': return cmdHook(args);
    case 'doctor': return cmdDoctor(args);
    case 'commands': return cmdCommands(args);
    case 'version': return cmdVersion(args);
    case 'drafts': return cmdDrafts(args);
    case 'discard': return cmdDiscard(args);
    case 'open': return cmdOpen(args);
    case 'completion': return cmdCompletion(args);
    case '--version':
    case '-v':
      print(AGENTFEED_CLI_VERSION);
      return;
    default:
      throw unknownCommandError({ command, knownCommands: PUBLIC_COMMANDS });
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonModeRequested()) {
    print(JSON.stringify(jsonErrorFromMessage(message), null, 2));
  } else {
    err(ui.formatCliError(message));
  }
  process.exitCode = 1;
});
