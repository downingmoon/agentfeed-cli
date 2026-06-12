#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { relative } from 'node:path';
import { initProject, loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { credentialsFromToken, credentialsPath, deleteSavedCredentials, loadCredentials, loadCredentialsWithMetadata, saveCredentials, type CredentialTokenSource } from '../config/credentials.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata } from '../config/api-base.js';
import { DEFAULT_API_BASE_URL } from '../config/defaults.js';
import { markCollectionComplete, readCollectionStateWithDiagnostics, resolveCollectionWindowWithDiagnostics } from '../config/collection-state.js';
import { collectDraft, collectDraftWithStatus } from '../draft/create.js';
import { findLatestDraft, listDrafts, readDraft, readLatestDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { formatCollectionExplain } from '../draft/explain.js';
import { cachedUploadReuseStatusForCredentials, checkApiCompatibility, checkApiReachability, checkIngestionToken, isTrustedReviewUrl, previewDraftRemote, publishDraft, type ApiMetadata } from '../api/client.js';
import { browserLogin } from '../auth/browser-login.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { applyRedactedPublicFields, publicScanFieldsFromDraft, scanAndRedactDraftPublicFields } from '../privacy/draft-sanitizer.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { collectGitMetrics } from '../collectors/git.js';
import { detectAgentSignals, formatAgentSignalLines, summarizeAgentSignals } from '../collectors/agent-discovery.js';
import { changedAreas } from '../summary/changed-areas.js';
import { hasAgentFeedHook, installClaudeCodeHook, uninstallClaudeCodeHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { unknownCommandError } from './unknown-command-error.js';
import { resolveStatusProject } from './status-project.js';
import { setupProgressText, statusNextActions, statusReadinessItems } from './status-readiness.js';
import { doctorNextActions, doctorPriorityActions, doctorReadinessItems, doctorSummary, type DoctorPriorityAction, type DoctorReadinessItem } from './doctor-readiness.js';
import { browserLoginCredentialResult, credentialJsonResult, rotateCredentialResult, tokenLoginCredentialResult, type CredentialResultView } from './auth-result.js';
import { apiCheckFailureDetail, apiCompatibilityFailureDetail, apiCompatibilityRecoveryCommands, formatUploadRecoveryMessage, ingestionTokenRecoveryCommands, uploadNextActions, type UploadPreflightOptions } from './upload-guidance.js';
import { collectJsonNextActions } from './draft-next-actions.js';
import { discardCompleteNextActions, openNextActions, shareDryRunNextActions } from './draft-navigation-actions.js';
import { commandCatalogNextActions, hookNextActions, initNextActions } from './guidance-actions.js';
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
import { discardCompletePayload, discardConfirmationPayload } from './discard-command.js';
import { openJsonPayload } from './open-command.js';
import { localPreviewJsonPayload, remotePreviewJsonPayload, renderLocalPreviewHumanLines, renderRemotePreviewHumanLines } from './preview-command.js';
import { formatPrivacyScanReport, privacyScanJsonOutput } from './privacy-scan-output.js';
import { draftListJsonOutput, renderDraftListHumanLines, type DraftListRow } from './draft-list-output.js';
import { formatCollectionCursor, nextDefaultCollectionSince, formatTokenExpiry, formatWarningLines, credentialSourceLabel, credentialStoreLabel, apiBaseSourceLabel, readinessMarker, tokenExpiryWarning } from './diagnostic-formatters.js';
import { renderStatusHumanLines, statusJsonPayload, type StatusHealth, type StatusOutputInput } from './status-output.js';
import { collectJsonPayload, renderCollectAutoUploadIgnoredWarningLines, renderCollectHumanLines } from './collect-output.js';
import { logoutJsonPayload, renderLogoutHumanLines } from './logout-output.js';
import { renderUploadConfirmationRequiredLines, renderUploadResultLines } from './upload-output.js';
import { createCommandCatalog } from './command-catalog.js';
import { buildCommandsJsonPayload, renderCommandsHumanLines } from './commands-output-renderer.js';
import { COMMAND_WORKFLOWS, renderCommandCatalogLines, renderCommandWorkflowLines } from './command-catalog-renderer.js';
import { COMMAND_DESCRIPTIONS, COMMAND_EXAMPLES, COMMAND_GROUPS, COMMAND_USAGE_OVERRIDES, KNOWN_COMMANDS, PUBLIC_COMMANDS } from './command-definitions.js';
import { COMMAND_ARG_SPECS, SUPPORTED_COMPLETION_SHELLS } from './command-arg-specs.js';
import { validateCommandArgs } from './command-argument-validator.js';
import { commandHelpText } from './command-help-text.js';
import { renderRootHelpLines } from './root-help-renderer.js';
import { formatMetricsRow, formatPrivacyPolicyLines, formatSharePreview, parseShareArgs, privacyPolicySummary } from './share.js';
import { parseAgentSource, SUPPORTED_SOURCES } from './source.js';
import { readJson, pathExists } from '../utils/fs.js';
import { openBrowser } from '../utils/open-browser.js';
import { copyToClipboard } from '../utils/clipboard.js';
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


function projectRelativePath(projectRoot: string, path: string): string {
  const rel = relative(projectRoot, path);
  return rel && !rel.startsWith('..') ? rel : path;
}


type CredentialsMetadata = Awaited<ReturnType<typeof loadCredentialsWithMetadata>>;

interface DiagnosticCredentialsMetadata {
  metadata: CredentialsMetadata;
  invalidApiBaseUrl: boolean;
}

function invalidApiBaseUrlMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  return error.message.startsWith('Invalid AgentFeed API base URL') ? error.message : null;
}

function invalidConfiguredApiBaseUrlLabel(): string {
  const value = process.env.AGENTFEED_API_BASE_URL?.trim();
  return value ? `invalid (${value})` : 'invalid';
}

function invalidApiBaseUrlWarnings(message: string): string[] {
  return [
    `invalid AgentFeed API URL setting ignored for diagnostics: ${message}`,
    'Fix AGENTFEED_API_BASE_URL, unset it, or set AGENTFEED_ALLOW_INSECURE_API=1 for explicit development-only HTTP testing.'
  ];
}

async function loadDiagnosticCredentialsWithMetadata(options: { cwd?: string } = {}): Promise<DiagnosticCredentialsMetadata> {
  try {
    return { metadata: await loadCredentialsWithMetadata(options), invalidApiBaseUrl: false };
  } catch (error) {
    const message = invalidApiBaseUrlMessage(error);
    if (!message) throw error;
    const tokenSource: CredentialTokenSource = process.env.AGENTFEED_TOKEN ? 'environment' : 'missing';
    const file = credentialsPath();
    return {
      invalidApiBaseUrl: true,
      metadata: {
        credentials: null,
        token_source: tokenSource,
        credentials_file_path: file,
        credentials_file_exists: await pathExists(file),
        credential_store: tokenSource === 'environment' ? 'environment' : 'missing',
        api_base_url: invalidConfiguredApiBaseUrlLabel(),
        api_base_url_source: 'environment',
        api_base_url_source_detail: 'AGENTFEED_API_BASE_URL',
        warnings: invalidApiBaseUrlWarnings(message)
      }
    };
  }
}

function printCredentialResult(options: CredentialResultView): void {
  print(ui.heading(options.heading));
  print(options.message);
  print();
  print(ui.section('Summary'));
  print(`Credentials: ${options.saved ? 'saved' : 'not saved'}`);
  if (options.apiBaseUrl) print(`API: ${options.apiBaseUrl}`);
  if (options.tokenExpiresAt) print(`Token expires at: ${formatTokenExpiry(options.tokenExpiresAt)}`);
  if (options.warnings?.length) {
    print();
    print(ui.section('Warnings'));
    printWarningLines(options.warnings);
  }
  print();
  print(ui.section('Next'));
  if (options.saved) {
    for (const command of options.next?.length ? options.next : ['agentfeed status']) print(`  ${ui.command(command)}`);
  } else {
    print('No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.');
    for (const command of options.next ?? ['agentfeed status']) print(`  ${ui.command(command)}`);
  }
}



function shouldCopyReviewUrl(options: { json?: boolean; noClipboard?: boolean; clipboard?: boolean }): boolean {
  if (options.noClipboard) return false;
  if (options.json) return options.clipboard === true;
  return true;
}

function emptyReviewUrlHandoff(): ReviewUrlHandoff {
  return {
    clipboard: { requested: false, ok: null },
    browser: { requested: false, ok: null }
  };
}

async function safeBooleanAction(action: () => Promise<boolean>): Promise<boolean> {
  try {
    return await action();
  } catch {
    return false;
  }
}

function rejectReviewUrlHandoff(handoff: ReviewUrlHandoff, options: { copy: boolean; open: boolean }): ReviewUrlHandoff {
  const warning = 'Review URL was rejected by trust policy. Run agentfeed share again to upload a fresh private review draft.';
  if (options.copy) {
    handoff.clipboard.requested = true;
    handoff.clipboard.ok = false;
    handoff.clipboard.warning = warning;
  }
  if (options.open) {
    handoff.browser.requested = true;
    handoff.browser.ok = false;
    handoff.browser.warning = warning;
  }
  return handoff;
}

async function handoffReviewUrl(reviewUrl: string, options: { copy: boolean; open: boolean; apiBaseUrl: string; reviewBaseUrl?: string | null }): Promise<ReviewUrlHandoff> {
  const handoff = emptyReviewUrlHandoff();
  if ((options.copy || options.open) && !isTrustedReviewUrl(reviewUrl, options.apiBaseUrl, options.reviewBaseUrl)) {
    return rejectReviewUrlHandoff(handoff, options);
  }
  const tasks: Promise<void>[] = [];
  if (options.copy) {
    handoff.clipboard.requested = true;
    tasks.push(safeBooleanAction(() => copyToClipboard(reviewUrl)).then((ok) => {
      handoff.clipboard.ok = ok;
      if (!ok) handoff.clipboard.warning = 'Review URL was not copied to clipboard. Copy the review URL manually.';
    }));
  }
  if (options.open) {
    handoff.browser.requested = true;
    tasks.push(safeBooleanAction(() => openBrowser(reviewUrl)).then((ok) => {
      handoff.browser.ok = ok;
      if (!ok) handoff.browser.warning = 'Review URL could not be opened automatically. Open the review URL manually.';
    }));
  }
  await Promise.all(tasks);
  return handoff;
}



const SAFE_TOKEN_STDIN_COMMAND = 'printf %s "$TOKEN" | agentfeed login --token-stdin';

function emptyTokenStdinMessage(): string {
  return [
    'No token received on stdin.',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`,
    'Run: agentfeed login'
  ].join('\n');
}

function unsafeArgvTokenMessage(): string {
  return [
    'Literal token input through --token <token> is disabled.',
    'Reason: argv can leak through shell history and process listings.',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`,
    'Run: agentfeed login',
    'For local throwaway development only: AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1 agentfeed login --token <token>'
  ].join('\n');
}

function missingTokenMessage(): string {
  return [
    'AgentFeed token is missing.',
    'Run: agentfeed login',
    `Run: ${SAFE_TOKEN_STDIN_COMMAND}`
  ].join('\n');
}


async function requireApiCompatibilityBeforeUpload(apiBaseUrl: string, options: UploadPreflightOptions = {}): Promise<ApiMetadata> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible && result.data) return result.data;
  throw new Error(formatUploadRecoveryMessage(
    `API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)} before uploading drafts.`,
    apiCompatibilityRecoveryCommands(result),
    options.retryCommand
  ));
}

async function requireIngestionTokenBeforeUpload(credentials: AgentFeedCredentials, options: UploadPreflightOptions = {}): Promise<void> {
  const result = await checkIngestionToken(credentials);
  if (result.ok) return;
  throw new Error(formatUploadRecoveryMessage(
    `Ingestion token check failed for ${result.url}: ${apiCheckFailureDetail(result)} before uploading drafts.`,
    ingestionTokenRecoveryCommands(result),
    options.retryCommand
  ));
}

async function requireUploadPreflight(credentials: AgentFeedCredentials, options: UploadPreflightOptions = {}): Promise<ApiMetadata> {
  const metadata = await requireApiCompatibilityBeforeUpload(credentials.api_base_url, options);
  await requireIngestionTokenBeforeUpload(credentials, options);
  return metadata;
}

async function requireApiCompatibilityBeforeCredentialSave(apiBaseUrl: string): Promise<void> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible) return;
  throw new Error([
    `API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)} before saving credentials.`,
    'Run: agentfeed doctor'
  ].join('\n'));
}

async function readStdinText(): Promise<string> {
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function readTokenFromStdin(): Promise<string> {
  const token = (await readStdinText()).trim();
  if (!token) throw new Error(emptyTokenStdinMessage());
  return token;
}

const CI_ENVIRONMENT_VARIABLES = [
  'AGENTFEED_CI',
  'CI',
  'GITHUB_ACTIONS',
  'GITLAB_CI',
  'BUILDKITE',
  'CIRCLECI',
  'JENKINS_URL',
  'TF_BUILD',
  'TEAMCITY_VERSION',
  'VERCEL',
  'NETLIFY',
];

function isTruthyEnvironmentValue(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== '0' && value.toLowerCase() !== 'false';
}

function isCiEnvironment(): boolean {
  return CI_ENVIRONMENT_VARIABLES.some((name) => isTruthyEnvironmentValue(process.env[name]));
}

function shouldRequireUploadConfirmation(options: { json?: boolean; yes?: boolean }): boolean {
  if (options.json || options.yes) return false;
  return true;
}

function printDiscardConfirmationRequired(id: string, options: { hadJson: boolean; hadMarkdown: boolean }): void {
  print(ui.heading('AgentFeed discard paused'));
  print('Discard confirmation required.');
  print('No local draft files were deleted.');
  print();
  print(ui.section('Summary'));
  print(`Draft: ${id}`);
  print(`JSON: ${options.hadJson ? 'will be removed' : 'not found'}`);
  print(`Markdown: ${options.hadMarkdown ? 'will be removed' : 'not found'}`);
  print();
  print(ui.section('Next'));
  print('Delete this local draft after reviewing it:');
  print(`  ${ui.command(`agentfeed discard --id ${id} --yes`)}`);
  print('Or preview it first:');
  print(`  ${ui.command(`agentfeed preview --id ${id}`)}`);
}

async function sanitizeDraftForCliOutput(cwd: string, draft: LocalDraft): Promise<LocalDraft> {
  scanAndRedactDraftPublicFields(draft);
  await writeDraft(cwd, draft);
  return draft;
}

function singleLine(value: string): string {
  const text = safeTerminalText(value).replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

async function shouldOpenReviewAfterUpload(openFlag: boolean, options: { respectConfig?: boolean; noOpen?: boolean } = {}): Promise<boolean> {
  if (options.noOpen) return false;
  if (openFlag) return true;
  if (isCiEnvironment()) return false;
  if (options.respectConfig === false) return false;
  try {
    const config = await loadProjectConfig(process.cwd());
    return config.collection.open_review_after_upload;
  } catch {
    return false;
  }
}


interface InitChecklistItem {
  name: string;
  detail: string;
  next_action?: string;
}

function initSetupChecklist(alreadyInitialized: boolean): InitChecklistItem[] {
  return alreadyInitialized
    ? [
      { name: 'Project', detail: 'existing config kept' },
      { name: 'Status', detail: 'inspect credentials, API, hooks, and drafts', next_action: 'agentfeed status' },
      { name: 'First draft', detail: 'collect locally without uploading', next_action: 'agentfeed share --dry' },
      { name: 'Reinitialize', detail: 'backup and recreate config only if needed', next_action: 'agentfeed init --force' }
    ]
    : [
      { name: 'Project', detail: 'config ready' },
      { name: 'Account', detail: 'connect this terminal to AgentFeed', next_action: 'agentfeed login' },
      { name: 'Agent hook', detail: 'capture Claude Code sessions automatically', next_action: 'agentfeed hook install claude-code' },
      { name: 'First draft', detail: 'collect locally without uploading', next_action: 'agentfeed share --dry' }
    ];
}

function printInitSetupChecklist(items: InitChecklistItem[]): void {
  print(ui.section('Setup checklist'));
  for (const item of items) {
    const next = item.next_action ? ` → ${item.next_action}` : '';
    print(`• ${item.name}: ${item.detail}${next}`);
  }
}


function doctorCheckMarker(value: boolean | string): string {
  const text = String(value).toLowerCase();
  if (text.startsWith('yes') || text === 'ready' || text === 'configured') return ui.good('✓');
  if (text.startsWith('no') || text.includes('invalid') || text.includes('unreachable')) return ui.warn('!');
  if (text.startsWith('skipped') || text.startsWith('unknown') || text.startsWith('unavailable')) return '-';
  return '•';
}

function printDoctorChecks(title: string, checks: Array<[string, boolean | string]>): void {
  print(ui.section(title));
  for (const [name, value] of checks) print(`${doctorCheckMarker(value)} ${name}: ${value}`);
  print();
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

function printUrlBlock(label: string, url: string): void {
  print(`${label}:`);
  print(`  ${ui.command(url)}`);
}



function printDoctorPriorityActions(actions: DoctorPriorityAction[]): void {
  if (!actions.length) return;
  print('Fix first:');
  actions.slice(0, 3).forEach((action, index) => {
    print(`  ${index + 1}. ${action.name}: ${action.detail}`);
    print(`     Run: ${action.command}`);
  });
}

function printDoctorSummary(readiness: DoctorReadinessItem[]): void {
  const summary = doctorSummary(readiness);
  const priorityActions = doctorPriorityActions(readiness);
  print(ui.section('Summary'));
  print(`Overall: ${summary.status === 'ready' ? 'ready' : 'attention needed'} (${summary.ready} ready, ${summary.attention} attention)`);
  for (const item of readiness) {
    const next = item.next_action ? ` → ${item.next_action}` : '';
    print(`${readinessMarker(item.status)} ${item.name}: ${item.detail}${next}`);
  }
  printDoctorPriorityActions(priorityActions);
  print();
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
  const nextActions = initNextActions(result.alreadyInitialized);
  const setupChecklist = initSetupChecklist(result.alreadyInitialized);
  if (flag(args, '--json')) {
    print(JSON.stringify({
      already_initialized: result.alreadyInitialized,
      project: {
        name: result.config.project.name,
        visibility: result.config.project.visibility,
        tags: result.config.project.tags
      },
      root: result.root,
      config_path: '.agentfeed/config.json',
      backup_paths: result.backupPaths.map((backupPath) => projectRelativePath(result.root, backupPath)),
      setup_checklist: setupChecklist,
      next_actions: nextActions
    }, null, 2));
    return;
  }
  print(ui.heading(result.alreadyInitialized ? 'AgentFeed already initialized' : result.backupPaths.length ? 'AgentFeed reinitialized' : 'AgentFeed initialized'));
  print(result.alreadyInitialized
    ? 'Existing AgentFeed config kept.'
    : result.backupPaths.length
      ? 'AgentFeed config recreated after backing up existing files.'
      : 'Project config created.');
  print();
  print(ui.section('Summary'));
  print(`Project: ${result.config.project.name}`);
  print(`Visibility: ${result.config.project.visibility}`);
  print('Config: .agentfeed/config.json');
  if (result.backupPaths.length) {
    print();
    print(ui.section('Backups'));
    for (const backupPath of result.backupPaths) print(projectRelativePath(result.root, backupPath));
  }
  print();
  printInitSetupChecklist(setupChecklist);
  print();
  print(ui.section('Next'));
  printRecommendedCommands(nextActions);
}

async function cmdLogin(args: string[]) {
  const tokenOption = option(args, '--token');
  const tokenFromStdin = flag(args, '--token-stdin') || tokenOption === '-';
  const json = flag(args, '--json');
  if (tokenOption && tokenOption !== '-' && tokenFromStdin) {
    throw new Error('Use only one token input method: --token -, or --token-stdin.');
  }
  if (tokenOption && tokenOption !== '-' && process.env.AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN !== '1') {
    throw new Error(unsafeArgvTokenMessage());
  }
  const token = tokenFromStdin ? await readTokenFromStdin() : tokenOption;
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  if (!token) {
    if (json) {
      throw new Error([
        'login --json requires token input so stdout stays machine-readable.',
        'Run: printf %s "$TOKEN" | agentfeed login --token-stdin --json',
        'Run: printf %s "$TOKEN" | agentfeed login --token - --json --no-save'
      ].join('\n'));
    }
    const existing = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open'), save: !noSave, cwd: process.cwd(), storedApiBaseUrl: existing.credentials?.api_base_url, allowCiBrowser: flag(args, '--browser') });
    const warnings: string[] = [];
    if (!noSave) {
      const saved = await loadCredentialsWithMetadata({ cwd: process.cwd() });
      warnings.push(...saved.warnings);
    }
    printCredentialResult(browserLoginCredentialResult({ noSave, credentials: creds, warnings }));
    return;
  }
  const loginApiOptions = { apiBaseUrl, cwd: process.cwd(), trustRepoDiscoveredApiBase: process.env.AGENTFEED_TRUST_REPO_API_BASE === '1' };
  const tokenCredentials = await credentialsFromToken(token, loginApiOptions);
  const creds = noSave
    ? tokenCredentials
    : await (async () => {
      await requireApiCompatibilityBeforeCredentialSave(tokenCredentials.api_base_url);
      return saveCredentials(token, { ...loginApiOptions, apiBaseUrl: tokenCredentials.api_base_url });
    })();
  const warnings: string[] = [];
  if (!noSave) {
    const saved = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    warnings.push(...saved.warnings);
  }
  const next = noSave ? ['agentfeed status'] : ['agentfeed status', 'agentfeed share --dry'];
  if (json) {
    print(JSON.stringify(credentialJsonResult({
      saved: !noSave,
      credentials: creds,
      warnings,
      next
    }), null, 2));
    return;
  }
  printCredentialResult(tokenLoginCredentialResult({ noSave, credentials: creds, warnings }));
}

async function replacementTokenIdForSavedCredentials(creds: NonNullable<Awaited<ReturnType<typeof loadCredentialsWithMetadata>>['credentials']>): Promise<string | undefined> {
  const check = await checkIngestionToken(creds);
  const id = check.ok && typeof check.data?.token?.id === 'string' && check.data.token.id.length > 0
    ? check.data.token.id
    : undefined;
  return id;
}

async function rotateViaBrowserLogin(args: string[], message: string, replaceTokenId?: string) {
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  const existing = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open'), save: !noSave, cwd: process.cwd(), storedApiBaseUrl: existing.credentials?.api_base_url, allowCiBrowser: flag(args, '--browser'), replaceTokenId: noSave ? undefined : replaceTokenId });
  printCredentialResult(rotateCredentialResult({ noSave, credentials: creds, message }));
}

async function cmdRotate(args: string[]) {
  const forceBrowser = flag(args, '--browser');
  const noSave = flag(args, '--no-save');
  const credentialResolution = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const creds = credentialResolution.credentials;
  if (forceBrowser || noSave || !creds) {
    const replaceTokenId = creds && !noSave ? await replacementTokenIdForSavedCredentials(creds) : undefined;
    await rotateViaBrowserLogin(
      args,
      creds
        ? replaceTokenId
          ? 'AgentFeed browser rotation complete. Previous saved token was revoked.'
          : 'AgentFeed browser replacement complete. Previous saved token could not be verified for revocation.'
        : 'No saved token found. Starting browser login replacement.',
      replaceTokenId,
    );
    return;
  }
  if (credentialResolution.token_source === 'environment') {
    throw new Error([
      'AGENTFEED_TOKEN is set, so AgentFeed cannot update that environment variable in-place.',
      'Rotate or issue a new token in AgentFeed Settings, then update AGENTFEED_TOKEN in your shell or secret manager.',
      'Alternatively run: unset AGENTFEED_TOKEN && agentfeed rotate --browser',
      'Then verify with: agentfeed status',
    ].join('\n'));
  }
  const replaceTokenId = await replacementTokenIdForSavedCredentials(creds);
  await rotateViaBrowserLogin(
    args,
    replaceTokenId
      ? 'AgentFeed token rotated after browser approval. Previous saved token was revoked.'
      : 'Saved token could not be verified. Browser login issued a replacement token, but the previous token may need manual revocation in Settings.',
    replaceTokenId,
  );
}

async function draftUploadPendingForStatus(path: string): Promise<boolean> {
  try {
    const draft = await readJson<unknown>(path);
    if (typeof draft !== 'object' || draft === null || Array.isArray(draft)) return false;
    const upload = (draft as { upload?: unknown }).upload;
    if (typeof upload !== 'object' || upload === null || Array.isArray(upload)) return true;
    return (upload as { uploaded?: unknown }).uploaded !== true;
  } catch {
    return false;
  }
}

async function cmdStatus(args: string[] = []) {
  const diagnostics = await loadDiagnosticCredentialsWithMetadata({ cwd: process.cwd() });
  const credentialResolution = diagnostics.metadata;
  const creds = credentialResolution.credentials;
  const hasToken = Boolean(creds) || credentialResolution.token_source !== 'missing';
  const projectResolution = await resolveStatusProject(process.cwd());
  const config = projectResolution.config;
  const root = projectResolution.root;
  const projectConfigError = projectResolution.configError;
  const drafts = config ? await listDrafts(root) : [];
  const pending = (await Promise.all(drafts.map((d) => draftUploadPendingForStatus(d.path)))).filter(Boolean).length;
  const collectionStateResult = config ? await readCollectionStateWithDiagnostics(root) : null;
  const collectionState = collectionStateResult?.state ?? {};
  const settingsPath = config ? resolveClaudeSettingsPath({ projectRoot: root, scope: config.agents.claude_code.hook_scope }) : '';
  let hook = 'unknown';
  const statusWarnings: string[] = [];
  if (settingsPath && await pathExists(settingsPath)) {
    try {
      hook = hasAgentFeedHook(await readJson<Record<string, unknown>>(settingsPath)) ? 'installed' : 'not installed';
    } catch {
      statusWarnings.push(`Claude Code settings could not be parsed at ${settingsPath}; hook status is unknown.`);
    }
  }
  const allWarnings = [
    ...credentialResolution.warnings,
    ...(projectConfigError ? [projectConfigError] : []),
    ...statusWarnings,
    ...(collectionStateResult?.warnings ?? [])
  ];
  const apiBaseUrl = credentialResolution.api_base_url ?? creds?.api_base_url ?? await resolveApiBaseUrl();
  const git = await collectGitMetrics(process.cwd());
  const insideGitRepository = Boolean(git.repository_root);
  const health: StatusHealth = diagnostics.invalidApiBaseUrl
    ? 'attention needed'
    : allWarnings.length || pending > 0
      ? 'attention needed'
      : !config
        ? 'attention needed'
        : !hasToken
          ? 'setup needed'
          : 'ready';
  const statusOptions = {
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectInitialized: Boolean(config),
    projectConfigError,
    hasToken,
    insideGitRepository,
    pendingUploads: pending
  };
  const nextActions = statusNextActions(statusOptions);
  const readiness = statusReadinessItems(statusOptions);
  const statusOutput: StatusOutputInput = {
    health,
    readiness,
    hasToken,
    tokenSource: credentialResolution.token_source,
    credentialStore: credentialResolution.credential_store,
    credentialsFileExists: credentialResolution.credentials_file_exists,
    credentialsFilePath: credentialResolution.credentials_file_path,
    tokenExpiresAt: creds?.token_expires_at ?? null,
    apiBaseUrl,
    apiBaseUrlSource: credentialResolution.api_base_url_source,
    apiBaseUrlSourceDetail: credentialResolution.api_base_url_source_detail,
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectInitialized: Boolean(config),
    projectName: config?.project.name ?? null,
    projectRoot: config ? root : null,
    projectConfigError,
    insideGitRepository,
    claudeCodeHook: hook,
    localDraftsCount: drafts.length,
    pendingUploadCount: pending,
    lastCollectionCursor: collectionState.last_collected_at ?? null,
    warnings: allWarnings,
    nextActions
  };

  if (flag(args, '--json')) {
    print(JSON.stringify(statusJsonPayload(statusOutput), null, 2));
    return;
  }

  printLines(renderStatusHumanLines(statusOutput));
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
      const creds = uploadCredentials;
      const metadata = await requireUploadPreflight(creds);
      const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds, reviewBaseUrl: metadata.review_base_url });
      draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), draft.id));
      if (flag(args, '--open-review')) {
        draft.upload.handoff = await handoffReviewUrl(result.review_url, { copy: false, open: true, apiBaseUrl: creds.api_base_url, reviewBaseUrl: result.review_base_url ?? metadata.review_base_url });
      }
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
  await loadProjectConfig(process.cwd());
  const collectionWindow = await resolveCollectionWindowWithDiagnostics({ cwd: process.cwd(), args });
  const window = collectionWindow.window;
  const creds = opts.dryRun ? null : await loadCredentials();

  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source: opts.source, sessionFile: opts.sessionFile, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), note: opts.note, runConfiguredCommands: opts.runConfiguredCommands, skipConfiguredCommands: opts.dryRun });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);
  const warnings = [...collectionWindow.warnings, ...collection.warnings];

  if (opts.json) {
    if (opts.dryRun || !creds) {
      const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance();
      print(JSON.stringify({
        dry_run: opts.dryRun,
        upload_skipped: !opts.dryRun && !creds ? { reason: 'token_missing', next_action: 'agentfeed login' } : null,
        reused_existing_draft: collection.reusedExisting,
        draft,
        privacy_policy: privacyPolicySummary(draft),
        warnings,
        next_actions: shareDryRunNextActions(draft.id, hasCredentials),
        ...(opts.explain ? { collection_explain: formatCollectionExplain(draft) } : {})
      }, null, 2));
      return;
    }
    const metadata = await requireUploadPreflight(creds);
    const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds, reviewBaseUrl: metadata.review_base_url });
    draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), draft.id));
    if (!opts.noSaveCursor) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    const handoff = await handoffReviewUrl(result.review_url, {
      copy: shouldCopyReviewUrl({ json: true, noClipboard: opts.noClipboard, clipboard: flag(args, '--clipboard') }),
      open: await shouldOpenReviewAfterUpload(opts.openReview, { respectConfig: false, noOpen: opts.noOpenReview }),
      apiBaseUrl: creds.api_base_url,
      reviewBaseUrl: result.review_base_url ?? metadata.review_base_url
    });
    print(JSON.stringify({
      dry_run: false,
      reused_existing_draft: collection.reusedExisting,
      draft_id: draft.id,
      draft,
      upload: result,
      privacy_policy: privacyPolicySummary(draft),
      handoff,
      warnings,
      next_actions: uploadNextActions(draft.id),
      ...(opts.explain ? { collection_explain: formatCollectionExplain(draft) } : {})
    }, null, 2));
    return;
  }

  if (collection.reusedExisting) print(`Reusing existing matching draft: ${draft.id}\n`);
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
    const nextActions = shareDryRunNextActions(draft.id, hasCredentials);
    print(ui.section('Next'));
    print(opts.dryRun
      ? `Dry run complete. Local draft kept: ${draft.id}`
      : `Upload skipped: AgentFeed token is missing. Local draft kept: ${draft.id}`);
    printRecommendedCommands(nextActions);
    return;
  }

  if (shouldRequireUploadConfirmation({ yes: opts.yes })) {
    printLines(renderUploadConfirmationRequiredLines(draft, `agentfeed publish --id ${draft.id} --yes`, 'agentfeed share --yes'));
    return;
  }

  const metadata = await requireUploadPreflight(creds);
  const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds, reviewBaseUrl: metadata.review_base_url });
  if (!opts.noSaveCursor) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
  const handoff = await handoffReviewUrl(result.review_url, {
    copy: shouldCopyReviewUrl({ noClipboard: opts.noClipboard }),
    open: await shouldOpenReviewAfterUpload(opts.openReview, { noOpen: opts.noOpenReview }),
    apiBaseUrl: creds.api_base_url,
    reviewBaseUrl: result.review_base_url ?? metadata.review_base_url
  });
  printLines(renderUploadResultLines({
    heading: result.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: result.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.',
    draftId: draft.id,
    result,
    handoff
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
  const draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), id));
  if (flag(args, '--remote')) {
    const creds = await loadCredentials();
    if (!creds) throw new Error(missingTokenMessage());
    await requireApiCompatibilityBeforeUpload(creds.api_base_url);
    const remote = await previewDraftRemote(draft, creds);
    if (flag(args, '--json')) {
      print(JSON.stringify(remotePreviewJsonPayload({ draftId: draft.id, remote }), null, 2));
    } else {
      printLines(renderRemotePreviewHumanLines({ draftId: draft.id, draftTitle: draft.worklog.title, remote }));
    }
    return;
  }
  if (flag(args, '--json')) { print(JSON.stringify(localPreviewJsonPayload(draft), null, 2)); return; }
  printLines(renderLocalPreviewHumanLines(draft));
}

async function cmdPublish(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const existingDraft = await readDraft(process.cwd(), id);
  const creds = await loadCredentials();
  if (!creds) throw new Error(missingTokenMessage());
  const cacheReuseStatus = cachedUploadReuseStatusForCredentials(existingDraft, creds);
  if (!cacheReuseStatus.reusable && shouldRequireUploadConfirmation({ json: flag(args, '--json'), yes: flag(args, '--yes') || flag(args, '-y') })) {
    printLines(renderUploadConfirmationRequiredLines(existingDraft, `agentfeed publish --id ${id} --yes`, undefined, existingDraft.upload.uploaded ? { cacheReuseReason: cacheReuseStatus.reason } : {}));
    return;
  }
  const metadata = await requireUploadPreflight(creds, { retryCommand: `agentfeed publish --id ${id} --yes` });
  const result = await publishDraft({ cwd: process.cwd(), id, credentials: creds, reviewBaseUrl: metadata?.review_base_url });
  const savedDraft = await readDraft(process.cwd(), id);
  if (flag(args, '--json')) {
    const handoff = await handoffReviewUrl(result.review_url, {
      copy: shouldCopyReviewUrl({ json: true, noClipboard: flag(args, '--no-clipboard'), clipboard: flag(args, '--clipboard') }),
      open: await shouldOpenReviewAfterUpload(flag(args, '--open-review'), { respectConfig: false, noOpen: flag(args, '--no-open-review') }),
      apiBaseUrl: creds.api_base_url,
      reviewBaseUrl: result.review_base_url ?? metadata?.review_base_url
    });
    print(JSON.stringify({ draft_id: id, upload: result, privacy_policy: privacyPolicySummary(savedDraft), handoff, next_actions: uploadNextActions(id) }, null, 2));
    return;
  }
  const privacyPolicyLines = formatPrivacyPolicyLines(savedDraft);
  const handoff = await handoffReviewUrl(result.review_url, {
    copy: shouldCopyReviewUrl({ noClipboard: flag(args, '--no-clipboard') }),
    open: await shouldOpenReviewAfterUpload(flag(args, '--open-review'), { noOpen: flag(args, '--no-open-review') }),
    apiBaseUrl: creds.api_base_url,
    reviewBaseUrl: result.review_base_url ?? metadata?.review_base_url
  });
  printLines(renderUploadResultLines({
    heading: result.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: result.reused_existing ? 'Private review draft already uploaded; reusing existing review URL.' : 'Private review draft uploaded.',
    draftId: id,
    result,
    handoff,
    privacyPolicyLines
  }));
}

async function cmdScan(args: string[]) {
  const dryRun = flag(args, '--dry-run') || flag(args, '--dry');
  const scanPath = option(args, '--path');
  if (scanPath) {
    const git = await collectGitMetrics(scanPath);
    const areas = changedAreas(git.changed_files);
    const input = { changed_areas: areas };
    const result = scanAndRedactFields(input);
    const scanOptions = { dryRun, path: scanPath };
    print(flag(args, '--json')
      ? JSON.stringify(privacyScanJsonOutput(input, result, scanOptions), null, 2)
      : formatPrivacyScanReport(input, result.redacted, result.scan, scanOptions));
    return;
  }
  const id = await resolveDraftId(process.cwd(), args);
  const draft = await readDraft(process.cwd(), id);
  const input = publicScanFieldsFromDraft(draft);
  const result = scanAndRedactFields(input);
  if (!dryRun) {
    applyRedactedPublicFields(draft, result.redacted);
    draft.privacy_scan = result.scan;
    await writeDraft(process.cwd(), draft);
  }
  const scanOptions = { dryRun, draftId: id };
  print(flag(args, '--json')
    ? JSON.stringify(privacyScanJsonOutput(input, result, scanOptions), null, 2)
    : formatPrivacyScanReport(input, result.redacted, result.scan, scanOptions));
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
    const nextActions = hookNextActions('install', dryRun);
    if (flag(args, '--json')) {
      print(JSON.stringify({
        target: 'claude-code',
        action: 'install',
        scope,
        dry_run: dryRun,
        settings_path: result.path,
        backup_path: result.backupPath ?? null,
        next_actions: nextActions
      }, null, 2));
      return;
    }
    print(ui.heading(dryRun ? 'AgentFeed hook dry run' : 'AgentFeed hook installed'));
    print(`${dryRun ? 'Would install' : 'Installed'} AgentFeed Claude Code hook.`);
    print();
    print(ui.section('Summary'));
    print('Target: claude-code');
    print('Action: install');
    print(`Scope: ${scope}`);
    print(`Dry run: ${dryRun ? 'yes' : 'no'}`);
    print(`Settings: ${result.path}`);
    if (result.backupPath) print(`Backup: ${result.backupPath}`);
    print();
    print(ui.section('Next'));
    printGuidedNextCommands(nextActions);
  } else if (action === 'uninstall') {
    const result = await uninstallClaudeCodeHook({ projectRoot: root, scope, settingsPath });
    const nextActions = hookNextActions('uninstall');
    if (flag(args, '--json')) {
      print(JSON.stringify({
        target: 'claude-code',
        action: 'uninstall',
        scope,
        settings_path: result.path,
        backup_path: result.backupPath ?? null,
        next_actions: nextActions
      }, null, 2));
      return;
    }
    print(ui.heading('AgentFeed hook removed'));
    print('Uninstalled AgentFeed Claude Code hook.');
    print();
    print(ui.section('Summary'));
    print('Target: claude-code');
    print('Action: uninstall');
    print(`Scope: ${scope}`);
    print(`Settings: ${result.path}`);
    if (result.backupPath) print(`Backup: ${result.backupPath}`);
    print();
    print(ui.section('Next'));
    printGuidedNextCommands(nextActions);
  } else throw new Error(hookUsageMessage());
}

function doctorCheckRows(checks: Array<[string, boolean | string]>): Array<{ name: string; value: boolean | string }> {
  return checks.map(([name, value]) => ({ name, value }));
}

async function cmdDoctor(args: string[] = []) {
  const runtimeChecks: Array<[string, boolean | string]> = [
    ['Node version', process.versions.node],
    ['agentfeed version', AGENTFEED_CLI_VERSION]
  ];
  const diagnostics = await loadDiagnosticCredentialsWithMetadata({ cwd: process.cwd() });
  const credentialResolution = diagnostics.metadata;
  const creds = credentialResolution.credentials;
  const apiResolution = credentialResolution.api_base_url
    ? null
    : await resolveApiBaseUrlWithMetadata({ cwd: process.cwd() });
  const apiBaseUrl = credentialResolution.api_base_url ?? apiResolution?.value ?? await resolveApiBaseUrl();
  const apiReachability = diagnostics.invalidApiBaseUrl ? null : await checkApiReachability(apiBaseUrl);
  const apiCompatibility = diagnostics.invalidApiBaseUrl ? null : await checkApiCompatibility(apiBaseUrl);
  const accountChecks: Array<[string, boolean | string]> = [
    ['global credentials file exists', creds ? 'yes' : 'no'],
    ['credentials file path', credentialResolution.credentials_file_path],
    ['credential source', credentialSourceLabel(credentialResolution.token_source)],
    ['credential store', credentialStoreLabel(credentialResolution.credential_store)],
    ['ingestion token exists', creds?.ingestion_token || credentialResolution.token_source === 'environment' ? 'yes' : 'no']
  ];
  const apiChecks: Array<[string, boolean | string]> = [
    ['API base URL configured', apiBaseUrl],
    [
    'API base URL source',
    apiBaseSourceLabel(
      credentialResolution.api_base_url_source ?? apiResolution?.source ?? 'default',
      credentialResolution.api_base_url_source_detail ?? apiResolution?.source_detail
    )
    ],
    ['API ready', apiReachability
      ? apiReachability.ok ? `yes (${apiReachability.status})` : `no (${apiReachability.status ?? apiReachability.error ?? 'unreachable'})`
      : 'skipped (invalid API base URL)'
    ],
    [
    'API compatibility',
    apiCompatibility
      ? apiCompatibility.compatible
      ? `yes (${apiCompatibility.data?.api_version ?? 'unknown'} / ${apiCompatibility.data?.contract_version ?? 'unknown'})`
      : `no (${apiCompatibility.status ?? apiCompatibility.error ?? 'unreachable'})`
      : 'skipped (invalid API base URL)'
    ]
  ];
  const tokenWarnings: string[] = [];
  if (creds?.ingestion_token && !diagnostics.invalidApiBaseUrl) {
    const tokenCheck = await checkIngestionToken(creds);
    accountChecks.push(['ingestion token valid', tokenCheck.ok ? `yes (${tokenCheck.status})` : `no (${tokenCheck.status ?? tokenCheck.error ?? 'unreachable'})`]);
    const expiresAt = tokenCheck.data?.token?.expires_at ?? creds.token_expires_at ?? null;
    accountChecks.push(['ingestion token expires at', expiresAt ? formatTokenExpiry(expiresAt) : 'unknown']);
    const warning = tokenExpiryWarning(expiresAt, tokenCheck.data?.token?.expiring_soon);
    if (warning) tokenWarnings.push(warning);
  } else if (credentialResolution.token_source === 'environment' && diagnostics.invalidApiBaseUrl) {
    accountChecks.push(['ingestion token valid', 'skipped (invalid API base URL)']);
    accountChecks.push(['ingestion token expires at', 'unknown']);
  } else {
    accountChecks.push(['ingestion token valid', 'skipped']);
    accountChecks.push(['ingestion token expires at', 'unknown']);
  }
  let collectionStateLabel = 'unavailable (project not initialized)';
  let nextCollectionSinceLabel = 'unavailable (project not initialized)';
  const projectResolution = await resolveStatusProject(process.cwd());
  const projectConfigError = projectResolution.configError;
  const projectConfigValid = Boolean(projectResolution.config);
  if (projectConfigValid) {
    const collectionStateResult = await readCollectionStateWithDiagnostics(process.cwd());
    collectionStateLabel = collectionStateResult.valid
      ? formatCollectionCursor(collectionStateResult.state.last_collected_at)
      : 'invalid (.agentfeed/state.json unreadable)';
    nextCollectionSinceLabel = collectionStateResult.valid
      ? nextDefaultCollectionSince(collectionStateResult.state.last_collected_at)
      : 'beginning (cursor ignored)';
    tokenWarnings.push(...collectionStateResult.warnings);
  } else if (projectConfigError) {
    collectionStateLabel = 'unavailable (project config unreadable)';
    nextCollectionSinceLabel = 'unavailable (project config unreadable)';
  }
  const git = await collectGitMetrics(process.cwd());
  const projectChecks: Array<[string, boolean | string]> = [
    ['project config valid', projectConfigValid ? 'yes' : 'no'],
    ...(projectConfigError ? [['project config error', projectConfigError] satisfies [string, string]] : []),
    ['current directory is git repository', git.repository_root ? 'yes' : 'no']
  ];
  const collectionChecks: Array<[string, boolean | string]> = [
    ['last collection cursor', collectionStateLabel],
    ['next default collection since', nextCollectionSinceLabel]
  ];
  const warnings = [
    ...credentialResolution.warnings,
    ...(apiResolution?.warnings ?? []),
    ...(projectConfigError ? [projectConfigError] : []),
    ...tokenWarnings
  ];
  const agentSignals = await detectAgentSignals({ cwd: process.cwd() });
  const agentSignalLines = formatAgentSignalLines(agentSignals);
  const agentSignalSummary = summarizeAgentSignals(agentSignals);
  const missingToken = !creds && credentialResolution.token_source === 'missing';
  const apiNeedsRecheck = !apiReachability?.ok || !apiCompatibility?.compatible;
  const nextActions = doctorNextActions({
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectConfigValid,
    projectConfigError,
    missingToken,
    insideGitRepository: Boolean(git.repository_root),
    tokenWarnings,
    apiNeedsRecheck
  });
  const readiness = doctorReadinessItems({
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectConfigValid,
    projectConfigError,
    missingToken,
    insideGitRepository: Boolean(git.repository_root),
    tokenWarnings,
    apiReachability,
    apiCompatibility,
    agentSignalLines
  });
  const summary = doctorSummary(readiness);
  const priorityActions = doctorPriorityActions(readiness);

  if (flag(args, '--json')) {
    print(JSON.stringify({
      summary,
      readiness,
      priority_actions: priorityActions,
      runtime: doctorCheckRows(runtimeChecks),
      account: doctorCheckRows(accountChecks),
      api: doctorCheckRows(apiChecks),
      project: doctorCheckRows(projectChecks),
      collection: doctorCheckRows(collectionChecks),
      warnings,
      agent_signal_summary: agentSignalSummary,
      agent_signals: agentSignalLines,
      next_actions: nextActions
    }, null, 2));
    return;
  }

  print(ui.heading('AgentFeed doctor'));
  print();

  printDoctorSummary(readiness);

  printDoctorChecks('Runtime', runtimeChecks);
  printDoctorChecks('Account', accountChecks);
  printDoctorChecks('API', apiChecks);
  printDoctorChecks('Project', projectChecks);
  printDoctorChecks('Collection', collectionChecks);

  if (warnings.length) {
    print(ui.section('Warnings'));
    printWarningLines(warnings);
    print();
  }

  print(ui.section('Agent signals'));
  for (const line of agentSignalLines) print(line);
  print();
  print(ui.section('Next'));
  printRecommendedCommands(nextActions);
}

function safeDraftListTitle(draft: LocalDraft): string {
  const result = scanAndRedactFields({ title: draft.worklog.title });
  return singleLine(String(result.redacted.title ?? draft.worklog.title));
}

async function draftListRow(row: Awaited<ReturnType<typeof listDrafts>>[number]): Promise<DraftListRow> {
  const updatedAt = new Date(row.mtimeMs).toISOString();
  try {
    const draft = await readDraft(process.cwd(), row.id);
    return {
      id: row.id,
      path: row.path,
      updated_at: updatedAt,
      valid: true,
      project: draft.project.name,
      title: safeDraftListTitle(draft),
      agent: draft.worklog.agent,
      status: draft.upload.uploaded ? 'uploaded' : 'pending',
      privacy: draft.privacy_scan.status,
      findings: draft.privacy_scan.findings.length,
      metrics: formatMetricsRow(draft),
      review_url: draft.upload.review_url ?? null
    };
  } catch (error) {
    return {
      id: row.id,
      path: row.path,
      updated_at: updatedAt,
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}


async function cmdDrafts(args: string[]) {
  await loadProjectConfig(process.cwd());
  const rows = await Promise.all((await listDrafts(process.cwd())).map((row) => draftListRow(row)));
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
    printDiscardConfirmationRequired(id, { hadJson, hadMarkdown });
    return;
  }
  await rm(jsonPath, { force: true });
  await rm(markdownPath, { force: true });
  if (flag(args, '--json')) {
    print(JSON.stringify(discardCompletePayload({ draftId: id, hadJson, hadMarkdown }), null, 2));
    return;
  }
  print(ui.heading('AgentFeed draft discarded'));
  print(`Discarded draft: ${id}`);
  print();
  print(ui.section('Summary'));
  print(`Draft: ${id}`);
  print(`JSON: ${hadJson ? 'removed' : 'not found'}`);
  print(`Markdown: ${hadMarkdown ? 'removed' : 'not found'}`);
  print();
  print(ui.section('Next'));
  printGuidedNextCommands(discardCompleteNextActions());
}

function notUploadedDraftMessage(draft: LocalDraft): string {
  return [
    `Draft has not been uploaded yet: ${draft.id}`,
    `Run: agentfeed publish --id ${draft.id} --yes`,
    `Run: agentfeed preview --id ${draft.id}`,
    'Run: agentfeed drafts'
  ].join('\n');
}

function noUploadedDraftsMessage(latestDraft: LocalDraft): string {
  return [
    'No uploaded local drafts found.',
    `Newest draft: ${latestDraft.id}`,
    `Run: agentfeed publish --id ${latestDraft.id} --yes`,
    'Run: agentfeed share --yes',
    'Run: agentfeed drafts'
  ].join('\n');
}

function noOpenableDraftsMessage(): string {
  return [
    'No uploaded review drafts found.',
    '',
    'Create and review a draft first:',
    'Run: agentfeed share --dry',
    'Run: agentfeed publish --latest --yes',
    '',
    'Or inspect saved drafts:',
    'Run: agentfeed drafts'
  ].join('\n');
}


async function resolveOpenDraft(args: string[]): Promise<LocalDraft> {
  await loadProjectConfig(process.cwd());
  const id = option(args, '--id');
  if (id && !flag(args, '--latest')) {
    const draft = await readDraft(process.cwd(), id);
    if (!draft.upload.review_url) throw new Error(notUploadedDraftMessage(draft));
    return draft;
  }

  const rows = await listDrafts(process.cwd());
  if (!rows.length) throw new Error(noOpenableDraftsMessage());

  let latestValidDraft: LocalDraft | null = null;
  for (const row of rows) {
    let draft: LocalDraft;
    try {
      draft = await readDraft(process.cwd(), row.id);
    } catch {
      continue;
    }
    latestValidDraft ??= draft;
    if (draft.upload.review_url) return draft;
  }

  if (latestValidDraft) throw new Error(noUploadedDraftsMessage(latestValidDraft));
  throw new Error([
    'No openable local drafts found.',
    'Run: agentfeed drafts',
    'Run: agentfeed collect --explain'
  ].join('\n'));
}

async function cmdOpen(args: string[]) {
  const draft = await resolveOpenDraft(args);
  const reviewUrl = draft.upload.review_url;
  if (!reviewUrl) throw new Error(notUploadedDraftMessage(draft));
  const trustedApiBases = new Set([DEFAULT_API_BASE_URL]);
  const warnings: string[] = [];
  if (draft.upload.api_base_url) trustedApiBases.add(draft.upload.api_base_url);
  try {
    const credentials = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    if (credentials.api_base_url) trustedApiBases.add(credentials.api_base_url);
  } catch (error) {
    const invalidApiMessage = invalidApiBaseUrlMessage(error);
    if (!invalidApiMessage) throw error;
    warnings.push(`ignored invalid AgentFeed API URL while opening a saved review URL: ${invalidApiMessage}`);
  }
  if (![...trustedApiBases].some((apiBaseUrl) => isTrustedReviewUrl(reviewUrl, apiBaseUrl, draft.upload.review_base_url))) {
    throw new Error('Saved draft review URL is invalid. Run agentfeed share again to upload a fresh private review draft.');
  }
  const opened = await openBrowser(reviewUrl);
  const openWarnings = [
    ...warnings,
    ...(!opened ? ['Review URL could not be opened automatically. Open review_url manually.'] : [])
  ];
  if (flag(args, '--json')) {
    print(JSON.stringify(openJsonPayload({
      draftId: draft.id,
      reviewUrl,
      opened,
      warnings: openWarnings
    }), null, 2));
    return;
  }
  if (!opened) {
    print(ui.heading('AgentFeed review URL'));
    print('Browser open failed. Open this URL manually:');
    print();
    print(ui.section('Summary'));
    print(`Draft: ${draft.id}`);
    printUrlBlock('Review URL', reviewUrl);
    if (warnings.length) {
      print();
      print(ui.section('Warnings'));
      printWarningLines(warnings);
    }
    print();
    print(ui.section('Next'));
    printGuidedNextCommands(openNextActions(draft.id));
    return;
  }
  print(ui.heading('AgentFeed review opened'));
  print('Opened review URL.');
  print();
  print(ui.section('Summary'));
  print(`Draft: ${draft.id}`);
  printUrlBlock('Review URL', reviewUrl);
  if (warnings.length) {
    print();
    print(ui.section('Warnings'));
    printWarningLines(warnings);
  }
  print();
  print(ui.section('Next'));
  printGuidedNextCommands(openNextActions(draft.id));
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
