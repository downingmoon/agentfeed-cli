#!/usr/bin/env node
import { loadProjectConfig } from '../config/project-config.js';
import { findLatestDraft } from '../draft/read.js';
import { flag, option } from './args.js';
import { unknownCommandError } from './unknown-command-error.js';
import { jsonErrorFromMessage } from './error-output.js';
import { leadingOptionError } from './leading-option-error.js';
import { hasHelpFlag } from './help-flag.js';
import { isTrailingHelpAlias } from './trailing-help-alias.js';
import { versionCommandOutput } from './version-command.js';
import { localPreviewJsonPayload, remotePreviewJsonPayload, renderLocalPreviewHumanLines, renderRemotePreviewHumanLines } from './preview-command.js';
import { runPreviewCommand } from './preview-execution.js';
import { formatPrivacyScanReport, privacyScanJsonOutput } from './privacy-scan-output.js';
import { runPrivacyScanCommand } from './scan-command.js';
import { runInitCliCommand } from './init-command.js';
import { runLoginCommand } from './login-command.js';
import { runLogoutCliCommand } from './logout-command.js';
import { runRotateCommand } from './rotate-command.js';
import { runStatusCommand } from './status-command.js';
import { runDoctorCommand } from './doctor-command.js';
import { runPublishCliCommand } from './publish-command.js';
import { runShareCliCommand } from './share-command.js';
import { runDiscardCliCommand, runDraftsCliCommand, runOpenCliCommand } from './local-draft-command.js';
import { KNOWN_COMMANDS, PUBLIC_COMMANDS } from './command-definitions.js';
import { COMMAND_ARG_SPECS } from './command-arg-specs.js';
import { validateCommandArgs } from './command-argument-validator.js';
import { printCommandHelp as printSurfaceCommandHelp, printHelp as printSurfaceHelp, printHelpTopic as printSurfaceHelpTopic, runCommandsCommand, runCompletionCommand } from './command-surface-command.js';
import { runCollectCliCommand } from './collect-command.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { deprecatedHookCommandMessage } from './command-recovery.js';
import * as ui from './ui.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function printLines(lines: readonly string[]): void { for (const line of lines) print(line); }
function err(text = '') { process.stderr.write(`${text}\n`); }

function jsonModeRequested(argv = process.argv.slice(2)): boolean {
  return argv.some((arg) => arg === '--json');
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
  await runInitCliCommand(args, { cwd: process.cwd(), print, printLines });
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
  await runLogoutCliCommand(args, { env: process.env, print, printLines });
}

async function cmdCollect(args: string[]) {
  await runCollectCliCommand(args, {
    cwd: process.cwd(),
    print,
    printLines,
    publish: cmdPublish
  });
}

async function cmdShare(args: string[]) {
  await runShareCliCommand(args, { cwd: process.cwd(), print, printLines });
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
  await runPublishCliCommand(args, {
    cwd: process.cwd(),
    print,
    printLines,
    resolveDraftId
  });
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


async function cmdDoctor(args: string[] = []) {
  await runDoctorCommand(args, {
    cwd: process.cwd(),
    nodeVersion: process.versions.node,
    print,
    printLines
  });
}

async function cmdDrafts(args: string[]) {
  await runDraftsCliCommand(args, { cwd: process.cwd(), print, printLines });
}

async function cmdDiscard(args: string[]) {
  await runDiscardCliCommand(args, { cwd: process.cwd(), print, printLines, resolveDraftId });
}

async function cmdOpen(args: string[]) {
  await runOpenCliCommand(args, { cwd: process.cwd(), print, printLines });
}

async function cmdCompletion(args: string[]) {
  await runCompletionCommand(args, { print });
}

async function cmdVersion(args: string[]) {
  print(versionCommandOutput({ args, version: AGENTFEED_CLI_VERSION }));
}

async function cmdCommands(args: string[]) {
  await runCommandsCommand(args, { print });
}

function printHelp(): void {
  printSurfaceHelp({ print });
}

function printCommandHelp(command: string): void {
  printSurfaceCommandHelp(command, { print });
}

function printHelpTopic(args: string[]): void {
  printSurfaceHelpTopic(args, { print });
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
  if (command === 'hook') throw new Error(deprecatedHookCommandMessage());
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
