#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { relative } from 'node:path';
import { initProject, loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { credentialsFromToken, credentialsPath, deleteSavedCredentials, loadCredentials, loadCredentialsWithMetadata, saveCredentials, type CredentialTokenSource } from '../config/credentials.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlSource } from '../config/api-base.js';
import { DEFAULT_API_BASE_URL } from '../config/defaults.js';
import { markCollectionComplete, readCollectionState, resolveCollectionWindow } from '../config/collection-state.js';
import { collectDraft, collectDraftWithStatus } from '../draft/create.js';
import { findLatestDraft, listDrafts, readDraft, readLatestDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { formatCollectionExplain } from '../draft/explain.js';
import { cachedUploadReuseStatusForCredentials, checkApiCompatibility, checkApiReachability, checkIngestionToken, isTrustedReviewUrl, previewDraftRemote, publishDraft, type ApiMetadata, type CachedUploadReuseFailureReason } from '../api/client.js';
import { browserLogin } from '../auth/browser-login.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { applyRedactedPublicFields, publicScanFieldsFromDraft, scanAndRedactDraftPublicFields, type PublicScanFields } from '../privacy/draft-sanitizer.js';
import type { AgentFeedCredentials, LocalDraft, ReviewUrlHandoff } from '../types.js';
import { collectGitMetrics } from '../collectors/git.js';
import { detectAgentSignals, formatAgentSignalLines, summarizeAgentSignals } from '../collectors/agent-discovery.js';
import { changedAreas } from '../summary/changed-areas.js';
import { hasAgentFeedHook, installClaudeCodeHook, uninstallClaudeCodeHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { formatMetricsRow, formatPrivacyPolicyLines, formatSharePreview, parseShareArgs, privacyPolicySummary } from './share.js';
import { parseAgentSource, SUPPORTED_SOURCES } from './source.js';
import { readJson, pathExists } from '../utils/fs.js';
import { openBrowser } from '../utils/open-browser.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { draftPaths } from '../draft/paths.js';
import * as ui from './ui.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function err(text = '') { process.stderr.write(`${text}\n`); }

function formatWarningLines(warning: string): string[] {
  return ui.wrapKeyValue('Warning', warning).map((line) => ui.warn(line));
}

function printWarningLines(warnings: string[]): void {
  for (const warning of warnings) {
    for (const line of formatWarningLines(warning)) print(line);
  }
}

function jsonModeRequested(argv = process.argv.slice(2)): boolean {
  return argv.some((arg) => arg === '--json');
}

function errorCodeFromMessage(message: string): string {
  const firstLine = message.split(/\r?\n/, 1)[0] ?? 'AgentFeed command failed.';
  return firstLine
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'agentfeed_error';
}

function jsonErrorFromMessage(message: string): {
  error: { code: string; message: string; details: string[] };
  next_actions: string[];
  suggestions: string[];
} {
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const details = lines.slice(1);
  const nextActions = lines
    .filter((line) => /^Run:\s+/i.test(line) || /^Use:\s+/i.test(line) || /^Try:\s+/i.test(line))
    .map((line) => line.replace(/^(Run|Use|Try):\s+/i, ''));
  const suggestions = lines
    .filter((line) => /^Did you mean:\s+/i.test(line))
    .map((line) => line.replace(/^Did you mean:\s+/i, ''));
  return {
    error: {
      code: errorCodeFromMessage(message),
      message: lines[0] ?? 'AgentFeed command failed.',
      details
    },
    next_actions: [...new Set(nextActions)],
    suggestions: [...new Set(suggestions)]
  };
}

function projectRelativePath(projectRoot: string, path: string): string {
  const rel = relative(projectRoot, path);
  return rel && !rel.startsWith('..') ? rel : path;
}

function credentialSourceLabel(source: CredentialTokenSource): string {
  switch (source) {
    case 'environment': return 'environment (AGENTFEED_TOKEN)';
    case 'credentials_file': return 'saved credentials file';
    case 'keychain': return 'OS keychain';
    case 'missing': return 'missing';
  }
}

function credentialStoreLabel(source: Awaited<ReturnType<typeof loadCredentialsWithMetadata>>['credential_store']): string {
  switch (source) {
    case 'environment': return 'environment (AGENTFEED_TOKEN)';
    case 'file': return 'private credentials file';
    case 'keychain': return 'OS keychain';
    case 'missing': return 'missing';
  }
}

function apiBaseSourceLabel(source: ApiBaseUrlSource, detail?: string): string {
  const suffix = detail ? ` (${detail})` : '';
  switch (source) {
    case 'explicit': return `explicit CLI option${suffix}`;
    case 'environment': return `environment (AGENTFEED_API_BASE_URL)`;
    case 'stored_credentials': return `saved credentials file${suffix}`;
    case 'env_file': return `discovered env file${suffix}`;
    case 'default': return `default${suffix}`;
  }
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

function formatTokenExpiry(expiresAt: string): string {
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return expiresAt;
  const deltaMs = expires - Date.now();
  const absMs = Math.abs(deltaMs);
  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor((absMs % 86_400_000) / 3_600_000);
  const relative = deltaMs < 0 ? `expired ${days}d ${hours}h ago` : `in ${days}d ${hours}h`;
  return `${new Date(expires).toISOString()} (${relative})`;
}

function draftModelsLabel(draft: LocalDraft): string | null {
  const models = draft.worklog.metrics.models_used?.length
    ? draft.worklog.metrics.models_used
    : draft.worklog.model ? [draft.worklog.model] : [];
  return models.length ? models.join(', ') : null;
}

function printCredentialResult(options: {
  heading: string;
  message: string;
  apiBaseUrl?: string | null;
  tokenExpiresAt?: string | null;
  saved: boolean;
  warnings?: string[];
  next?: string[];
}): void {
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

function credentialJsonResult(options: {
  saved: boolean;
  apiBaseUrl: string;
  tokenExpiresAt?: string | null;
  user?: AgentFeedCredentials['user'];
  warnings?: string[];
  next: string[];
}): Record<string, unknown> {
  return {
    saved: options.saved,
    api_base_url: options.apiBaseUrl,
    token_expires_at: options.tokenExpiresAt ?? null,
    user: options.user ?? null,
    warnings: options.warnings ?? [],
    next_actions: options.next
  };
}

function formatCollectionCursor(value?: string | null): string {
  if (!value) return 'none';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return `invalid (${value})`;
  return new Date(parsed).toISOString();
}

function nextDefaultCollectionSince(value?: string | null): string {
  return value ? formatCollectionCursor(value) : 'beginning';
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

function reviewUrlHandoffLines(handoff: ReviewUrlHandoff, reviewUrl: string): string[] {
  const lines: string[] = [];
  let manualUrlNeeded = false;
  if (handoff.clipboard.requested) {
    if (handoff.clipboard.ok) lines.push('Review URL copied to clipboard.');
    else {
      lines.push(...formatWarningLines(handoff.clipboard.warning ?? 'Review URL was not copied to clipboard. Copy it manually.'));
      manualUrlNeeded = true;
    }
  }
  if (handoff.browser.requested) {
    if (handoff.browser.ok) lines.push('Review URL opened in browser.');
    else {
      lines.push(...formatWarningLines(handoff.browser.warning ?? 'Review URL could not be opened automatically. Open it manually.'));
      manualUrlNeeded = true;
    }
  }
  if (manualUrlNeeded) {
    lines.push('Manual review URL:');
    lines.push(`  ${ui.command(reviewUrl)}`);
  }
  return lines;
}

function uploadNextActions(draftId: string): string[] {
  return uniqueNextCommands([
    `agentfeed open --id ${draftId}`,
    `agentfeed preview --id ${draftId}`
  ]);
}

function previewNextActions(draft: LocalDraft): string[] {
  return uniqueNextCommands([
    draft.upload.uploaded ? `agentfeed open --id ${draft.id}` : `agentfeed publish --id ${draft.id} --yes`,
    `agentfeed scan --id ${draft.id}`
  ]);
}

function collectJsonNextActions(draft: LocalDraft): string[] {
  return draft.upload.uploaded
    ? uploadNextActions(draft.id)
    : uniqueNextCommands([
      `agentfeed preview --id ${draft.id}`,
      `agentfeed publish --id ${draft.id} --yes`
    ]);
}

function remotePreviewNextActions(draftId: string, valid: boolean): string[] {
  return valid
    ? uniqueNextCommands([`agentfeed publish --id ${draftId} --yes`, `agentfeed scan --id ${draftId}`])
    : uniqueNextCommands([`agentfeed scan --id ${draftId}`, `agentfeed preview --id ${draftId} --remote`]);
}

function printUploadResult(options: {
  heading: string;
  message: string;
  draftId: string;
  result: Awaited<ReturnType<typeof publishDraft>>;
  handoff: ReviewUrlHandoff;
  privacyPolicyLines?: string[];
}): void {
  print(ui.heading(options.heading));
  print(options.message);
  const privacyPolicyLines = options.privacyPolicyLines ?? [];
  if (privacyPolicyLines.length) {
    print();
    print(ui.section('Policy'));
    for (const line of privacyPolicyLines) print(line);
  }

  print();
  print(ui.section('Summary'));
  print(`Draft: ${options.draftId}`);
  print(`Status: ${options.result.status}`);
  printUrlBlock('Review URL', options.result.review_url);

  const handoffLines = reviewUrlHandoffLines(options.handoff, options.result.review_url);
  if (handoffLines.length) {
    print();
    print(ui.section('Handoff'));
    for (const line of handoffLines) print(line);
  }

  print();
  print(ui.section('Next'));
  printGuidedNextCommands(uploadNextActions(options.draftId));
}

function apiCompatibilityFailureDetail(result: Awaited<ReturnType<typeof checkApiCompatibility>>): string {
  return result.status != null
    ? `HTTP ${result.status}`
    : result.error ?? 'unknown compatibility failure';
}

function apiCheckFailureDetail(result: Awaited<ReturnType<typeof checkIngestionToken>>): string {
  return result.status != null
    ? `HTTP ${result.status}`
    : result.error ?? 'unknown token check failure';
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

interface UploadPreflightOptions {
  retryCommand?: string;
}

function formatRecoveryMessage(firstLine: string, fixCommands: string[], retryCommand?: string): string {
  const lines = [
    firstLine,
    '',
    'Fix first:',
    ...uniqueNextCommands(fixCommands).map(command => `Run: ${command}`)
  ];
  if (retryCommand) {
    lines.push('', 'Then retry:', `Run: ${retryCommand}`);
  }
  return lines.join('\n');
}

function apiCompatibilityRecoveryCommands(result: Awaited<ReturnType<typeof checkApiCompatibility>>): string[] {
  const commands = ['agentfeed doctor', 'agentfeed status'];
  if (result.status == null) commands.push('agentfeed doctor --json');
  return commands;
}

function ingestionTokenRecoveryCommands(result: Awaited<ReturnType<typeof checkIngestionToken>>): string[] {
  if (result.status === 401 || result.status === 403) {
    return ['agentfeed login', 'agentfeed rotate', 'agentfeed status'];
  }
  if (result.status == null || (result.status >= 500 && result.status <= 599)) {
    return ['agentfeed doctor', 'agentfeed status'];
  }
  return ['agentfeed login', 'agentfeed rotate', 'agentfeed doctor', 'agentfeed status'];
}

async function requireApiCompatibilityBeforeUpload(apiBaseUrl: string, options: UploadPreflightOptions = {}): Promise<ApiMetadata> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible && result.data) return result.data;
  throw new Error(formatRecoveryMessage(
    `API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)} before uploading drafts.`,
    apiCompatibilityRecoveryCommands(result),
    options.retryCommand
  ));
}

async function requireIngestionTokenBeforeUpload(credentials: AgentFeedCredentials, options: UploadPreflightOptions = {}): Promise<void> {
  const result = await checkIngestionToken(credentials);
  if (result.ok) return;
  throw new Error(formatRecoveryMessage(
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

function cachedUploadReuseReasonLabel(reason: CachedUploadReuseFailureReason): string {
  switch (reason) {
    case 'missing_upload_marker': return 'no saved private review upload marker is present';
    case 'missing_worklog_id': return 'saved upload metadata is missing the worklog id';
    case 'missing_review_url': return 'saved upload metadata is missing the review URL';
    case 'missing_payload_hash': return 'saved upload metadata is missing the redacted payload hash';
    case 'missing_credential_binding': return 'saved upload metadata is missing the credential binding';
    case 'base_url_mismatch': return 'saved upload was created for a different API base URL';
    case 'invalid_review_url': return 'saved review URL is no longer trusted for the current API/review origin';
    case 'payload_hash_mismatch': return 'local draft content changed after the saved upload';
    case 'credential_binding_mismatch': return 'saved upload was created with a different token or user binding';
  }
}

function printUploadConfirmationRequired(draft: LocalDraft, command: string, extraCommand?: string, options: { cacheReuseReason?: CachedUploadReuseFailureReason } = {}): void {
  print(ui.heading('AgentFeed upload paused'));
  print('Upload confirmation required.');
  print('No data was uploaded to AgentFeed.');
  if (options.cacheReuseReason) {
    print();
    print(ui.section('Warnings'));
    print(`Saved private review cache cannot be reused: ${cachedUploadReuseReasonLabel(options.cacheReuseReason)}.`);
  }
  print();
  print(ui.section('Summary'));
  print(`Draft: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Title: ${draft.worklog.title}`);
  print(`Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`);
  print();
  print(ui.section('Review before upload'));
  print(`Preview: ${ui.command(`agentfeed preview --id ${draft.id}`)}`);
  print(`Privacy: ${draft.privacy_scan.findings.length ? 'review findings before public sharing' : 'no findings detected'}`);
  print('Target: private AgentFeed review draft');
  print('Safety: no upload happens until you rerun with --yes.');
  print();
  print(ui.section('Next'));
  print('Upload after reviewing this draft:');
  print(`  ${ui.command(command)}`);
  if (extraCommand) {
    print('Or collect and upload in one command:');
    print(`  ${ui.command(extraCommand)}`);
  }
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

function tokenExpiryWarning(expiresAt?: string | null, expiringSoon?: boolean): string | null {
  if (!expiresAt) return null;
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return null;
  if (expires <= Date.now()) return 'ingestion token is expired. Run: agentfeed rotate';
  if (expiringSoon || expires - Date.now() <= 7 * 86_400_000) return 'ingestion token expires soon. Run: agentfeed rotate to replace this device token.';
  return null;
}

async function sanitizeDraftForCliOutput(cwd: string, draft: LocalDraft): Promise<LocalDraft> {
  scanAndRedactDraftPublicFields(draft);
  await writeDraft(cwd, draft);
  return draft;
}

function flattenStringFields(input: PublicScanFields, prefix = ''): Array<[string, string]> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(input)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') entries.push([field, value]);
    else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'string') entries.push([`${field}.${i}`, item]);
        else if (item && typeof item === 'object') entries.push(...flattenStringFields(item as PublicScanFields, `${field}.${i}`));
      });
    } else if (value && typeof value === 'object') {
      entries.push(...flattenStringFields(value as PublicScanFields, field));
    }
  }
  return entries;
}

function singleLine(value: string): string {
  const text = value.replace(/\s+/g, ' ').trim();
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function redactedFieldPreviews(original: PublicScanFields, redacted: PublicScanFields): Array<{ field: string; value: string }> {
  const originalFields = new Map(flattenStringFields(original));
  return flattenStringFields(redacted)
    .filter(([field, value]) => originalFields.get(field) !== value)
    .map(([field, value]) => ({ field, value: singleLine(value) }));
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

function privacyScanNextActions(options: { dryRun?: boolean; draftId?: string; path?: string } = {}): string[] {
  if (options.draftId) {
    return options.dryRun
      ? [`agentfeed scan --id ${options.draftId}`]
      : [`agentfeed preview --id ${options.draftId}`, `agentfeed publish --id ${options.draftId} --yes`];
  }
  if (options.path) return ['agentfeed collect --explain'];
  return ['agentfeed status'];
}

function privacyScanJsonOutput(
  input: PublicScanFields,
  result: ReturnType<typeof scanAndRedactFields>,
  options: { dryRun?: boolean; draftId?: string; path?: string } = {}
): Record<string, unknown> {
  const target = options.draftId
    ? { type: 'draft', id: options.draftId }
    : options.path
      ? { type: 'path', path: options.path }
      : { type: 'input' };
  const mode = options.draftId
    ? (options.dryRun ? 'dry_run' : 'redact_and_save')
    : 'inspect_only';
  return {
    dry_run: Boolean(options.dryRun),
    mode,
    target,
    saved: Boolean(options.draftId && !options.dryRun),
    scan: result.scan,
    redacted_fields: redactedFieldPreviews(input, result.redacted),
    next_actions: privacyScanNextActions(options)
  };
}

function hookNextActions(action: 'install' | 'uninstall', dryRun = false): string[] {
  if (action === 'install' && dryRun) return ['agentfeed hook install claude-code'];
  if (action === 'install') return ['agentfeed status', 'agentfeed share --dry'];
  return ['agentfeed status'];
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

function initNextActions(alreadyInitialized: boolean): string[] {
  return alreadyInitialized
    ? ['agentfeed status', 'agentfeed share --dry', 'agentfeed init --force']
    : ['agentfeed login', 'agentfeed hook install claude-code', 'agentfeed share --dry'];
}

function formatPrivacyScanReport(input: PublicScanFields, redacted: PublicScanFields, scan: ReturnType<typeof scanAndRedactFields>['scan'], options: { dryRun?: boolean; draftId?: string; path?: string } = {}): string {
  const target = options.draftId ? `draft ${options.draftId}` : options.path ? `path ${options.path}` : 'current input';
  const mode = options.draftId
    ? (options.dryRun ? 'dry run' : 'redact and save')
    : 'inspect only';
  const result = scan.findings.length
    ? 'Sensitive public fields found; review redactions before sharing.'
    : 'No public-field findings detected.';
  const lines = [
    ui.heading('AgentFeed privacy scan'),
    '',
    ui.section('Summary'),
    `Target: ${target}`,
    `Mode: ${mode}`,
    `Privacy: ${scan.status}`,
    `Findings: ${scan.findings.length}`,
    `Result: ${result}`
  ];
  if (options.draftId) {
    if (options.dryRun) {
      lines.push('Dry run: draft not modified.');
    } else if (scan.findings.length) {
      lines.push('Saved: redacted public fields were written to the local draft.');
    } else {
      lines.push('Saved: privacy scan result was written to the local draft.');
    }
  }
  if (options.path) lines.push('Path scan: inspect only; no draft was modified.');
  if (scan.findings.length) {
    lines.push('', ui.section('Findings detail'));
    for (const finding of scan.findings) {
      lines.push(`- [${finding.severity}] ${finding.type}${finding.field ? ` at ${finding.field}` : ''} -> ${finding.sample_redacted ?? '[REDACTED]'}`);
    }
  } else {
    lines.push('', ui.section('Findings detail'));
    lines.push('No findings detected.');
  }
  const previews = redactedFieldPreviews(input, redacted);
  if (previews.length) {
    lines.push('', ui.section('Redacted preview'));
    for (const preview of previews) lines.push(`- ${preview.field}: ${preview.value}`);
  } else {
    lines.push('', ui.section('Redacted preview'));
    lines.push('No redactions needed.');
  }
  lines.push('', ui.section('Next'));
  for (const command of privacyScanNextActions(options)) {
    lines.push(`  ${ui.command(command)}`);
  }
  return lines.join('\n');
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

function uniqueNextCommands(commands: string[]): string[] {
  const seen = new Set<string>();
  return commands.filter((command) => {
    if (seen.has(command)) return false;
    seen.add(command);
    return true;
  });
}

function printNextCommands(commands: string[]): void {
  for (const command of uniqueNextCommands(commands)) {
    print(`  ${ui.command(command)}`);
  }
}

function printRecommendedCommands(commands: string[]): void {
  const unique = uniqueNextCommands(commands);
  if (!unique.length) return;
  print('Recommended order:');
  unique.forEach((command, index) => {
    print(`  ${index + 1}. ${ui.command(command)}`);
  });
}

function printGuidedNextCommands(commands: string[]): void {
  const unique = uniqueNextCommands(commands);
  if (unique.length > 1) {
    printRecommendedCommands(unique);
    return;
  }
  printNextCommands(unique);
}

function printUrlBlock(label: string, url: string): void {
  print(`${label}:`);
  print(`  ${ui.command(url)}`);
}

function shareDryRunNextActions(draftId: string, hasCredentials: boolean): string[] {
  return uniqueNextCommands([
    `agentfeed preview --id ${draftId}`,
    ...(!hasCredentials ? ['agentfeed login'] : []),
    `agentfeed publish --id ${draftId} --yes`
  ]);
}

interface StatusReadinessItem {
  name: string;
  status: 'ready' | 'attention';
  detail: string;
  next_action?: string;
}

function statusReadinessItems(options: {
  invalidApiBaseUrl: boolean;
  projectInitialized: boolean;
  hasToken: boolean;
  insideGitRepository: boolean;
  pendingUploads: number;
}): StatusReadinessItem[] {
  const projectInitAction = options.insideGitRepository ? 'agentfeed init' : 'git init && agentfeed init';
  return [
    options.invalidApiBaseUrl
      ? { name: 'API', status: 'attention', detail: 'invalid API base URL', next_action: 'agentfeed doctor' }
      : { name: 'API', status: 'ready', detail: 'base URL accepted' },
    options.projectInitialized
      ? { name: 'Project', status: 'ready', detail: 'initialized' }
      : { name: 'Project', status: 'attention', detail: 'not initialized', next_action: projectInitAction },
    options.insideGitRepository
      ? { name: 'Git', status: 'ready', detail: 'repository detected' }
      : { name: 'Git', status: 'attention', detail: 'repository not detected', next_action: 'git init' },
    options.hasToken
      ? { name: 'Account', status: 'ready', detail: 'token configured' }
      : { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' },
    options.pendingUploads > 0
      ? {
        name: 'Uploads',
        status: 'attention',
        detail: `${options.pendingUploads} pending draft${options.pendingUploads === 1 ? '' : 's'}`,
        next_action: 'agentfeed publish --latest --yes'
      }
      : { name: 'Uploads', status: 'ready', detail: 'no pending uploads' }
  ];
}

function readinessMarker(status: StatusReadinessItem['status']): string {
  return status === 'ready' ? ui.good('✓') : ui.warn('!');
}

function statusSummary(readiness: StatusReadinessItem[]): { status: 'ready' | 'attention_needed'; ready: number; attention: number; total: number } {
  const attention = readiness.filter((item) => item.status === 'attention').length;
  return {
    status: attention === 0 ? 'ready' : 'attention_needed',
    ready: readiness.length - attention,
    attention,
    total: readiness.length
  };
}

function setupProgressText(readiness: StatusReadinessItem[]): string {
  const summary = statusSummary(readiness);
  const attentionLabel = summary.attention === 1 ? '1 needs attention' : `${summary.attention} need attention`;
  return `${summary.ready}/${summary.total} ready · ${attentionLabel}`;
}

function printStatusReadiness(items: StatusReadinessItem[]): void {
  print(ui.section('Readiness'));
  print(`Setup progress: ${setupProgressText(items)}`);
  for (const item of items) {
    const next = item.next_action ? ` → ${item.next_action}` : '';
    print(`${readinessMarker(item.status)} ${item.name}: ${item.detail}${next}`);
  }
}

function statusNextActions(options: {
  invalidApiBaseUrl: boolean;
  projectInitialized: boolean;
  hasToken: boolean;
  insideGitRepository: boolean;
  pendingUploads: number;
}): string[] {
  if (options.invalidApiBaseUrl) {
    return uniqueNextCommands([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed status',
      'agentfeed doctor'
    ]);
  }
  if (!options.projectInitialized) {
    return uniqueNextCommands([
      ...(options.insideGitRepository ? ['agentfeed init'] : ['git init && agentfeed init', 'agentfeed init --no-git-check']),
      ...(!options.hasToken ? ['agentfeed login'] : [])
    ]);
  }
  if (!options.hasToken) {
    return uniqueNextCommands([
      'agentfeed login',
      ...(options.pendingUploads > 0
        ? ['agentfeed publish --latest --yes', 'agentfeed discard --latest']
        : ['agentfeed share --dry'])
    ]);
  }
  if (options.pendingUploads > 0) {
    return uniqueNextCommands([
      'agentfeed publish --latest --yes',
      'agentfeed discard --latest'
    ]);
  }
  return ['agentfeed share --yes'];
}


interface DoctorReadinessItem {
  name: string;
  status: 'ready' | 'attention';
  detail: string;
  next_action?: string;
}

function detectedAgentSignalCount(lines: string[]): number {
  return lines.filter((line) => /^.+: detected$/.test(line.trim())).length;
}

function doctorApiDetail(options: {
  invalidApiBaseUrl: boolean;
  apiReachability: Awaited<ReturnType<typeof checkApiReachability>> | null;
  apiCompatibility: Awaited<ReturnType<typeof checkApiCompatibility>> | null;
}): string {
  if (options.invalidApiBaseUrl) return 'invalid API base URL';
  if (!options.apiReachability?.ok) {
    return `API not reachable (${options.apiReachability?.status ?? options.apiReachability?.error ?? 'unreachable'})`;
  }
  if (!options.apiCompatibility?.compatible) {
    return `API contract mismatch (${options.apiCompatibility?.status ?? options.apiCompatibility?.error ?? 'unknown'})`;
  }
  return 'reachable and compatible';
}

function doctorReadinessItems(options: {
  invalidApiBaseUrl: boolean;
  projectConfigValid: boolean;
  missingToken: boolean;
  insideGitRepository: boolean;
  tokenWarnings: string[];
  apiReachability: Awaited<ReturnType<typeof checkApiReachability>> | null;
  apiCompatibility: Awaited<ReturnType<typeof checkApiCompatibility>> | null;
  agentSignalLines: string[];
}): DoctorReadinessItem[] {
  const apiReady = !options.invalidApiBaseUrl && Boolean(options.apiReachability?.ok && options.apiCompatibility?.compatible);
  const agentSignalCount = detectedAgentSignalCount(options.agentSignalLines);
  const projectInitAction = options.insideGitRepository ? 'agentfeed init' : 'git init && agentfeed init';
  return [
    options.missingToken
      ? { name: 'Account', status: 'attention', detail: 'token missing', next_action: 'agentfeed login' }
      : options.tokenWarnings.length
      ? { name: 'Account', status: 'attention', detail: options.tokenWarnings[0], next_action: 'agentfeed rotate' }
      : { name: 'Account', status: 'ready', detail: 'token configured' },
    apiReady
      ? { name: 'API', status: 'ready', detail: doctorApiDetail(options) }
      : {
        name: 'API',
        status: 'attention',
        detail: doctorApiDetail(options),
        next_action: options.invalidApiBaseUrl ? 'unset AGENTFEED_API_BASE_URL' : 'agentfeed doctor'
      },
    options.projectConfigValid
      ? { name: 'Project', status: 'ready', detail: 'initialized' }
      : { name: 'Project', status: 'attention', detail: 'not initialized', next_action: projectInitAction },
    options.insideGitRepository
      ? { name: 'Git', status: 'ready', detail: 'repository detected' }
      : { name: 'Git', status: 'attention', detail: 'repository not detected', next_action: 'git init' },
    options.projectConfigValid
      ? { name: 'Collection', status: 'ready', detail: 'cursor available' }
      : { name: 'Collection', status: 'attention', detail: 'unavailable until project is initialized', next_action: projectInitAction },
    agentSignalCount > 0
      ? {
        name: 'Agent signals',
        status: 'ready',
        detail: `${agentSignalCount} source${agentSignalCount === 1 ? '' : 's'} detected`
      }
      : {
        name: 'Agent signals',
        status: 'attention',
        detail: 'no supported agent signals detected',
        next_action: 'agentfeed collect --explain'
      }
  ];
}

function doctorSummary(readiness: DoctorReadinessItem[]): { status: 'ready' | 'attention_needed'; ready: number; attention: number } {
  const attention = readiness.filter((item) => item.status === 'attention').length;
  return {
    status: attention > 0 ? 'attention_needed' : 'ready',
    ready: readiness.length - attention,
    attention
  };
}

interface DoctorPriorityAction {
  name: string;
  detail: string;
  command: string;
}

function doctorPriorityActions(readiness: DoctorReadinessItem[]): DoctorPriorityAction[] {
  const priorityOrder = ['API', 'Project', 'Git', 'Account', 'Collection', 'Agent signals'];
  return readiness
    .filter((item) => item.status === 'attention' && item.next_action)
    .sort((a, b) => priorityOrder.indexOf(a.name) - priorityOrder.indexOf(b.name))
    .map((item) => ({ name: item.name, detail: item.detail, command: item.next_action as string }));
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

function doctorNextActions(options: {
  invalidApiBaseUrl: boolean;
  projectConfigValid: boolean;
  missingToken: boolean;
  insideGitRepository: boolean;
  tokenWarnings: string[];
  apiNeedsRecheck: boolean;
}): string[] {
  if (options.invalidApiBaseUrl) {
    return uniqueNextCommands([
      'unset AGENTFEED_API_BASE_URL',
      'AGENTFEED_ALLOW_INSECURE_API=1 agentfeed doctor'
    ]);
  }
  return uniqueNextCommands([
    ...(!options.projectConfigValid
      ? (options.insideGitRepository ? ['agentfeed init'] : ['git init && agentfeed init', 'agentfeed init --no-git-check'])
      : []),
    ...(options.missingToken ? ['agentfeed login'] : []),
    ...(options.projectConfigValid && options.missingToken ? ['agentfeed share --dry'] : []),
    ...(options.tokenWarnings.length ? ['agentfeed rotate'] : []),
    ...(options.apiNeedsRecheck ? ['agentfeed doctor'] : []),
    ...(options.projectConfigValid && !options.missingToken && !options.tokenWarnings.length && !options.apiNeedsRecheck ? ['agentfeed share --dry'] : [])
  ]);
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
    printCredentialResult({
      heading: noSave ? 'AgentFeed login complete (not saved)' : 'AgentFeed login complete',
      message: noSave ? 'AgentFeed browser login complete (not saved).' : 'AgentFeed browser login complete.',
      apiBaseUrl: creds.api_base_url,
      tokenExpiresAt: creds.token_expires_at,
      saved: !noSave,
      warnings,
      next: noSave ? ['agentfeed login', 'agentfeed status'] : ['agentfeed status', 'agentfeed share --dry']
    });
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
      apiBaseUrl: creds.api_base_url,
      tokenExpiresAt: creds.token_expires_at,
      user: creds.user,
      warnings,
      next
    }), null, 2));
    return;
  }
  printCredentialResult({
    heading: noSave ? 'AgentFeed token loaded (not saved)' : 'AgentFeed credentials saved',
    message: noSave ? 'AgentFeed token loaded for this command only (not saved).' : 'AgentFeed credentials saved.',
    apiBaseUrl: creds.api_base_url,
    tokenExpiresAt: creds.token_expires_at,
    saved: !noSave,
    warnings,
    next
  });
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
  printCredentialResult({
    heading: noSave ? 'AgentFeed token replacement complete (not saved)' : 'AgentFeed token replacement complete',
    message: noSave ? message : `${message}\nSaved replacement token.`,
    apiBaseUrl: creds.api_base_url,
    tokenExpiresAt: creds.token_expires_at,
    saved: !noSave,
    next: noSave ? ['agentfeed status'] : ['agentfeed status', 'agentfeed share --dry']
  });
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
  let config: Awaited<ReturnType<typeof loadProjectConfig>> | null = null;
  let root = process.cwd();
  try { root = await resolveProjectRoot(process.cwd()); config = await loadProjectConfig(root); } catch { /* not initialized */ }
  const drafts = config ? await listDrafts(root) : [];
  const pending = (await Promise.all(drafts.map((d) => draftUploadPendingForStatus(d.path)))).filter(Boolean).length;
  const collectionState = config ? await readCollectionState(root) : {};
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
  const allWarnings = [...credentialResolution.warnings, ...statusWarnings];
  const apiBaseUrl = credentialResolution.api_base_url ?? creds?.api_base_url ?? await resolveApiBaseUrl();
  const git = await collectGitMetrics(process.cwd());
  const insideGitRepository = Boolean(git.repository_root);
  const health = diagnostics.invalidApiBaseUrl
    ? 'attention needed'
    : !hasToken
    ? 'setup needed'
    : !config
      ? 'project setup needed'
      : allWarnings.length || pending > 0
        ? 'attention needed'
        : 'ready';
  const statusOptions = {
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectInitialized: Boolean(config),
    hasToken,
    insideGitRepository,
    pendingUploads: pending
  };
  const nextActions = statusNextActions(statusOptions);
  const readiness = statusReadinessItems(statusOptions);

  if (flag(args, '--json')) {
    print(JSON.stringify({
      health,
      summary: statusSummary(readiness),
      readiness,
      account: {
        token_configured: hasToken,
        token_source: credentialResolution.token_source,
        token_source_label: credentialSourceLabel(credentialResolution.token_source),
        credential_store: credentialResolution.credential_store,
        credential_store_label: credentialStoreLabel(credentialResolution.credential_store),
        credentials_file: {
          exists: credentialResolution.credentials_file_exists,
          path: credentialResolution.credentials_file_path
        },
        token_expires_at: creds?.token_expires_at ?? null
      },
      api: {
        base_url: apiBaseUrl,
        source: credentialResolution.api_base_url_source ?? null,
        source_label: credentialResolution.api_base_url_source
          ? apiBaseSourceLabel(credentialResolution.api_base_url_source, credentialResolution.api_base_url_source_detail)
          : null,
        source_detail: credentialResolution.api_base_url_source_detail ?? null,
        invalid: diagnostics.invalidApiBaseUrl
      },
      project: {
        initialized: Boolean(config),
        name: config?.project.name ?? null,
        root: config ? root : null,
        git_repository: insideGitRepository,
        claude_code_hook: hook
      },
      collection: {
        local_drafts_count: drafts.length,
        pending_upload_count: pending,
        last_collection_cursor: collectionState.last_collected_at ?? null,
        last_collection_cursor_label: formatCollectionCursor(collectionState.last_collected_at),
        next_default_collection_since: collectionState.last_collected_at ?? null,
        next_default_collection_since_label: nextDefaultCollectionSince(collectionState.last_collected_at)
      },
      warnings: allWarnings,
      next_actions: nextActions
    }, null, 2));
    return;
  }

  print(ui.heading('AgentFeed status'));
  print(`Health: ${health === 'ready' ? ui.good(health) : ui.warn(health)}`);
  print();
  printStatusReadiness(readiness);
  print();
  print(ui.section('Account'));
  print(`User/token: ${hasToken ? 'configured' : 'missing'}`);
  print(`User/token source: ${credentialSourceLabel(credentialResolution.token_source)}`);
  print(`Credential store: ${credentialStoreLabel(credentialResolution.credential_store)}`);
  print(`Credentials file: ${credentialResolution.credentials_file_exists ? credentialResolution.credentials_file_path : 'missing'}`);
  if (creds?.token_expires_at) {
    print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
    const warning = tokenExpiryWarning(creds.token_expires_at);
    if (warning) printWarningLines([warning]);
  }
  print();
  print(ui.section('API'));
  print(`API base URL: ${apiBaseUrl}`);
  if (credentialResolution.api_base_url_source) {
    print(`API base URL source: ${apiBaseSourceLabel(credentialResolution.api_base_url_source, credentialResolution.api_base_url_source_detail)}`);
  }
  printWarningLines(allWarnings);
  print();
  print(ui.section('Project'));
  print(`Project initialized: ${config ? 'yes' : 'no'}`);
  if (config) print(`Project name: ${config.project.name}`);
  print(`Git repository: ${insideGitRepository ? 'yes' : 'no'}`);
  print(`Claude Code hook: ${hook}`);
  print();
  print(ui.section('Collection'));
  print(`Local drafts count: ${drafts.length}`);
  print(`Pending upload count: ${pending}`);
  print(`Last collection cursor: ${formatCollectionCursor(collectionState.last_collected_at)}`);
  print(`Next default collection since: ${nextDefaultCollectionSince(collectionState.last_collected_at)}`);
  if (pending > 0 && collectionState.last_collected_at) {
    printWarningLines(['pending local drafts exist while a collection cursor is set; publish/discard them or use --all/--since if the next collect looks empty.']);
  }
  print();
  print(ui.section('Next'));
  printRecommendedCommands(nextActions);
}


interface LogoutSecurityChecklistItem {
  name: string;
  status: 'done' | 'attention';
  detail: string;
  next_action?: string;
}

function logoutSecurityChecklist(options: { credentialsFileDeleted: boolean; envTokenActive: boolean; keychainDeleted?: boolean | null }): LogoutSecurityChecklistItem[] {
  const items: LogoutSecurityChecklistItem[] = [
    options.credentialsFileDeleted
      ? { name: 'Saved credentials', status: 'done', detail: 'removed from this machine' }
      : { name: 'Saved credentials', status: 'done', detail: 'no saved credentials found' },
    options.envTokenActive
      ? { name: 'Environment token', status: 'attention', detail: 'AGENTFEED_TOKEN is still active in this shell', next_action: 'unset AGENTFEED_TOKEN' }
      : { name: 'Environment token', status: 'done', detail: 'not set in this shell' }
  ];
  if (options.keychainDeleted === true) items.splice(1, 0, { name: 'OS keychain token', status: 'done', detail: 'removed' });
  if (options.keychainDeleted === false) items.splice(1, 0, { name: 'OS keychain token', status: 'attention', detail: 'not removed', next_action: 'agentfeed logout' });
  return items;
}

function printLogoutSecurityChecklist(items: LogoutSecurityChecklistItem[]): void {
  print(ui.section('Security checklist'));
  for (const item of items) {
    const marker = item.status === 'done' ? ui.good('✓') : ui.warn('!');
    const next = item.next_action ? ` → ${item.next_action}` : '';
    print(`${marker} ${item.name}: ${item.detail}${next}`);
  }
}

async function cmdLogout(args: string[]) {
  const result = await deleteSavedCredentials();
  const envTokenActive = Boolean(process.env.AGENTFEED_TOKEN);
  const securityChecklist = logoutSecurityChecklist({
    credentialsFileDeleted: result.credentials_file_deleted,
    envTokenActive,
    keychainDeleted: result.keychain_deleted
  });
  if (flag(args, '--json')) {
    print(JSON.stringify({
      credentials_file_deleted: result.credentials_file_deleted,
      credentials_file_path: result.credentials_file_path,
      keychain_deleted: result.keychain_deleted,
      environment_token_active: envTokenActive,
      warnings: [
        ...result.warnings,
        ...(envTokenActive ? ['AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.'] : [])
      ],
      security_checklist: securityChecklist,
      next_actions: ['agentfeed status']
    }, null, 2));
    return;
  }
  print(ui.heading('AgentFeed logout complete'));
  print(result.credentials_file_deleted ? 'AgentFeed saved credentials removed.' : 'No saved AgentFeed credentials were found.');
  print();
  print(ui.section('Summary'));
  print(`Credentials file: ${result.credentials_file_deleted ? 'removed' : 'not found'}`);
  if (result.keychain_deleted === true) print('OS keychain token removed.');
  if (result.keychain_deleted === false) print('OS keychain token: not removed');
  const warnings = [...result.warnings];
  if (envTokenActive) {
    warnings.push('AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.');
  }
  if (warnings.length) {
    print();
    print(ui.section('Warnings'));
    printWarningLines(warnings);
  }
  print();
  printLogoutSecurityChecklist(securityChecklist);
  print();
  print(ui.section('Next'));
  print(`  ${ui.command('agentfeed status')}`);
}

async function cmdCollect(args: string[]) {
  const source = parseAgentSource(option(args, '--source'), 'collect');
  const config = await loadProjectConfig(process.cwd());
  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const uploadRequested = flag(args, '--upload');
  const uploadCredentials = uploadRequested ? await loadCredentials() : null;
  if (uploadRequested && !uploadCredentials) throw new Error(missingTokenMessage());
  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source, sessionFile: option(args, '--session-file') ?? null, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), runConfiguredCommands: flag(args, '--run-configured-commands') });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);
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
    print(JSON.stringify({ ...draft, next_actions: collectJsonNextActions(draft) }, null, 2));
    return;
  }
  print(ui.heading(collection.reusedExisting ? 'AgentFeed draft reused' : 'AgentFeed draft ready'));
  print(collection.reusedExisting ? 'Existing matching draft reused.\n' : 'Draft created.\n');
  print(ui.section('Summary'));
  print(`ID: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Title: ${singleLine(draft.worklog.title)}`);
  print(`Privacy: ${draft.privacy_scan.status}`);
  if (flag(args, '--dry') || flag(args, '--dry-run')) print('Mode: dry run (local draft only; no upload attempted)');
  print();
  print(ui.section('Signals'));
  print(`Agent: ${draft.worklog.agent}`);
  const models = draftModelsLabel(draft);
  if (models) print(`Models: ${models}`);
  for (const line of ui.wrapKeyValue('Metrics', formatMetricsRow(draft))) print(line);
  if (flag(args, '--explain')) {
    print();
    print(ui.section('Collection'));
    print(formatCollectionExplain(draft));
  }
  print();
  print(ui.section('Next'));
  printRecommendedCommands(collectJsonNextActions(draft));
  if (uploadRequested) {
    await cmdPublish(['--id', draft.id, '--yes', ...(flag(args, '--open-review') ? ['--open-review'] : []), ...(flag(args, '--no-open-review') ? ['--no-open-review'] : [])]);
  } else {
    if (!flag(args, '--no-upload') && config.collection.auto_upload) {
      print();
      print(ui.section('Warnings'));
      print('Note: collection.auto_upload is ignored by collect for safety. Use agentfeed collect --upload to upload explicitly.');
    }
  }
  if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
}

async function cmdShare(args: string[]) {
  const opts = parseShareArgs(args);
  await loadProjectConfig(process.cwd());
  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const creds = opts.dryRun ? null : await loadCredentials();

  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source: opts.source, sessionFile: opts.sessionFile, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), note: opts.note, runConfiguredCommands: opts.runConfiguredCommands, skipConfiguredCommands: opts.dryRun });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);

  if (opts.json) {
    if (opts.dryRun || !creds) {
      const hasCredentials = Boolean(creds) || await hasCredentialsForPublishGuidance();
      print(JSON.stringify({
        dry_run: opts.dryRun,
        upload_skipped: !opts.dryRun && !creds ? { reason: 'token_missing', next_action: 'agentfeed login' } : null,
        reused_existing_draft: collection.reusedExisting,
        draft,
        privacy_policy: privacyPolicySummary(draft),
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
      next_actions: uploadNextActions(draft.id),
      ...(opts.explain ? { collection_explain: formatCollectionExplain(draft) } : {})
    }, null, 2));
    return;
  }

  if (collection.reusedExisting) print(`Reusing existing matching draft: ${draft.id}\n`);
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
    printUploadConfirmationRequired(draft, `agentfeed publish --id ${draft.id} --yes`, 'agentfeed share --yes');
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
  printUploadResult({
    heading: result.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: result.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.',
    draftId: draft.id,
    result,
    handoff
  });
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
      print(JSON.stringify({ draft_id: draft.id, ...remote, next_actions: remotePreviewNextActions(draft.id, remote.valid) }, null, 2));
    } else {
      print(ui.heading('AgentFeed remote preview'));
      print();
      print(ui.section('Summary'));
      print(`Remote preview: ${remote.valid ? 'valid' : 'invalid'}`);
      print(`Warnings: ${remote.warnings.length ? remote.warnings.join(', ') : 'none'}`);
      print(`Title: ${singleLine(String(remote.preview.title ?? draft.worklog.title))}`);
      print();
      print(ui.section('Next'));
      printGuidedNextCommands(remotePreviewNextActions(draft.id, remote.valid));
    }
    return;
  }
  if (flag(args, '--json')) { print(JSON.stringify({ ...draft, next_actions: previewNextActions(draft) }, null, 2)); return; }
  const uploadStatus = draft.upload.uploaded ? 'uploaded' : 'pending';
  print(ui.heading('AgentFeed preview'));
  print();
  print(`@local · ${draft.worklog.agent} · ${draft.project.name}`);
  print();
  print(ui.section('Summary'));
  print(`ID: ${draft.id}`);
  print(`Title: ${singleLine(draft.worklog.title)}`);
  for (const line of ui.wrapKeyValue('Summary', singleLine(draft.worklog.summary))) print(line);
  print();
  print(ui.section('Details'));
  for (const line of ui.wrapKeyValue('Metrics', formatMetricsRow(draft))) print(line);
  print(`Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`);
  print(`Upload: ${uploadStatus}`);
  if (draft.upload.review_url) printUrlBlock('Review URL', draft.upload.review_url);
  print();
  print(ui.section('Next'));
  printRecommendedCommands(previewNextActions(draft));
}

async function cmdPublish(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const existingDraft = await readDraft(process.cwd(), id);
  const creds = await loadCredentials();
  if (!creds) throw new Error(missingTokenMessage());
  const cacheReuseStatus = cachedUploadReuseStatusForCredentials(existingDraft, creds);
  if (!cacheReuseStatus.reusable && shouldRequireUploadConfirmation({ json: flag(args, '--json'), yes: flag(args, '--yes') || flag(args, '-y') })) {
    printUploadConfirmationRequired(existingDraft, `agentfeed publish --id ${id} --yes`, undefined, existingDraft.upload.uploaded ? { cacheReuseReason: cacheReuseStatus.reason } : {});
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
  printUploadResult({
    heading: result.reused_existing ? 'AgentFeed upload reused' : 'AgentFeed upload complete',
    message: result.reused_existing ? 'Private review draft already uploaded; reusing existing review URL.' : 'Private review draft uploaded.',
    draftId: id,
    result,
    handoff,
    privacyPolicyLines
  });
}

async function cmdScan(args: string[]) {
  const dryRun = flag(args, '--dry-run') || flag(args, '--dry');
  if (option(args, '--path')) {
    const git = await collectGitMetrics(option(args, '--path')!);
    const areas = changedAreas(git.changed_files);
    const input = { changed_areas: areas };
    const result = scanAndRedactFields(input);
    const scanOptions = { dryRun, path: option(args, '--path')! };
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
  let projectConfigValid = false;
  try {
    await loadProjectConfig(process.cwd());
    projectConfigValid = true;
    const collectionState = await readCollectionState(process.cwd());
    collectionStateLabel = formatCollectionCursor(collectionState.last_collected_at);
    nextCollectionSinceLabel = nextDefaultCollectionSince(collectionState.last_collected_at);
  } catch {
    projectConfigValid = false;
  }
  const git = await collectGitMetrics(process.cwd());
  const projectChecks: Array<[string, boolean | string]> = [
    ['project config valid', projectConfigValid ? 'yes' : 'no'],
    ['current directory is git repository', git.repository_root ? 'yes' : 'no']
  ];
  const collectionChecks: Array<[string, boolean | string]> = [
    ['last collection cursor', collectionStateLabel],
    ['next default collection since', nextCollectionSinceLabel]
  ];
  const warnings = [...credentialResolution.warnings, ...(apiResolution?.warnings ?? []), ...tokenWarnings];
  const agentSignals = await detectAgentSignals({ cwd: process.cwd() });
  const agentSignalLines = formatAgentSignalLines(agentSignals);
  const agentSignalSummary = summarizeAgentSignals(agentSignals);
  const missingToken = !creds && credentialResolution.token_source === 'missing';
  const apiNeedsRecheck = !apiReachability?.ok || !apiCompatibility?.compatible;
  const nextActions = doctorNextActions({
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectConfigValid,
    missingToken,
    insideGitRepository: Boolean(git.repository_root),
    tokenWarnings,
    apiNeedsRecheck
  });
  const readiness = doctorReadinessItems({
    invalidApiBaseUrl: diagnostics.invalidApiBaseUrl,
    projectConfigValid,
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

interface DraftListRow {
  id: string;
  path: string;
  updated_at: string;
  valid: boolean;
  project?: string;
  title?: string;
  agent?: string;
  status?: 'pending' | 'uploaded';
  privacy?: string;
  findings?: number;
  metrics?: string;
  review_url?: string | null;
  error?: string;
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

function discardConfirmationNextActions(id: string): string[] {
  return [`agentfeed discard --id ${id} --yes`, `agentfeed preview --id ${id}`];
}

function discardCompleteNextActions(): string[] {
  return ['agentfeed drafts', 'agentfeed collect --explain'];
}

interface DraftListSummary {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
  uploaded: number;
}

function draftListSummary(rows: DraftListRow[]): DraftListSummary {
  const validRows = rows.filter((row) => row.valid);
  return {
    total: rows.length,
    valid: validRows.length,
    invalid: rows.length - validRows.length,
    pending: validRows.filter((row) => row.status === 'pending').length,
    uploaded: validRows.filter((row) => row.status === 'uploaded').length
  };
}

function printDraftListSummary(summary: DraftListSummary): void {
  print(ui.section('Summary'));
  print(`Total: ${summary.total}`);
  print(`Pending upload: ${summary.pending}`);
  print(`Uploaded: ${summary.uploaded}`);
  if (summary.invalid > 0) print(ui.warn(`Invalid: ${summary.invalid}`));
  print('Order: newest first');
}

function formatRelativeTime(value: string, now = Date.now()): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;

  const deltaMs = parsed - now;
  const absMs = Math.abs(deltaMs);
  const future = deltaMs > 0;
  const suffix = future ? 'from now' : 'ago';

  if (absMs < 60_000) return future ? 'in less than 1m' : 'just now';
  const minutes = Math.floor(absMs / 60_000);
  if (minutes < 60) return future ? `in ${minutes}m` : `${minutes}m ${suffix}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ${suffix}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return future ? `in ${days}d` : `${days}d ${suffix}`;
  const months = Math.floor(days / 30);
  if (months < 12) return future ? `in ${months}mo` : `${months}mo ${suffix}`;
  const years = Math.floor(days / 365);
  return future ? `in ${years}y` : `${years}y ${suffix}`;
}

function formatDraftUpdatedAt(value: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return `${new Date(parsed).toISOString()} (${formatRelativeTime(value)})`;
}

function draftListNextActions(rows: DraftListRow[]): string[] {
  if (!rows.length) {
    return ['agentfeed collect --explain', 'agentfeed share --dry'];
  }

  const latest = rows.find((row) => row.valid);
  if (!latest) {
    return ['agentfeed collect --explain'];
  }

  return uniqueNextCommands([
    `agentfeed preview --id ${latest.id}`,
    latest.status === 'uploaded' ? `agentfeed open --id ${latest.id}` : `agentfeed publish --id ${latest.id} --yes`
  ]);
}

async function cmdDrafts(args: string[]) {
  await loadProjectConfig(process.cwd());
  const rows = await Promise.all((await listDrafts(process.cwd())).map((row) => draftListRow(row)));
  const summary = draftListSummary(rows);
  const nextActions = draftListNextActions(rows);
  if (flag(args, '--json')) {
    print(JSON.stringify({ summary, drafts: rows, next_actions: nextActions }, null, 2));
    return;
  }

  print(ui.heading(`AgentFeed drafts (${rows.length})`));
  if (!rows.length) {
    print();
    print('No local drafts found.');
    print();
    print(ui.section('Next'));
    printRecommendedCommands(nextActions);
    return;
  }

  print();
  printDraftListSummary(summary);
  print();
  for (const row of rows) {
    if (!row.valid) {
      print(`${row.id}  invalid`);
      print(`  Updated: ${formatDraftUpdatedAt(row.updated_at)}`);
      print(`  Error: ${row.error}`);
      continue;
    }
    print(`${row.id}  ${row.status}  ${row.agent}  ${row.privacy} · findings ${row.findings}`);
    print(`  Updated: ${formatDraftUpdatedAt(row.updated_at)}`);
    print(`  Project: ${row.project}`);
    print(`  Title: ${row.title}`);
    for (const line of ui.wrapKeyValue('  Metrics', row.metrics ?? 'no metrics')) print(line);
    if (row.status === 'uploaded') {
      print(`  Open: ${ui.command(`agentfeed open --id ${row.id}`)}`);
    } else {
      print(`  Upload: ${ui.command(`agentfeed publish --id ${row.id} --yes`)}`);
    }
  }

  print();
  print(ui.section('Next'));
  printRecommendedCommands(nextActions);
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
      print(JSON.stringify({
        confirmation_required: true,
        deleted: false,
        draft_id: id,
        files: {
          json: { existed: hadJson, will_remove: hadJson, removed: false },
          markdown: { existed: hadMarkdown, will_remove: hadMarkdown, removed: false }
        },
        next_actions: discardConfirmationNextActions(id)
      }, null, 2));
      return;
    }
    printDiscardConfirmationRequired(id, { hadJson, hadMarkdown });
    return;
  }
  await rm(jsonPath, { force: true });
  await rm(markdownPath, { force: true });
  if (flag(args, '--json')) {
    print(JSON.stringify({
      confirmation_required: false,
      deleted: true,
      draft_id: id,
      files: {
        json: { existed: hadJson, removed: hadJson },
        markdown: { existed: hadMarkdown, removed: hadMarkdown }
      },
      next_actions: discardCompleteNextActions()
    }, null, 2));
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

function openNextActions(draftId: string): string[] {
  return uniqueNextCommands([
    `agentfeed preview --id ${draftId}`,
    'agentfeed status'
  ]);
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
    print(JSON.stringify({
      draft_id: draft.id,
      review_url: reviewUrl,
      opened,
      warnings: openWarnings,
      next_actions: openNextActions(draft.id)
    }, null, 2));
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

function completionOptionsFor(command: string): string[] {
  const spec = COMMAND_ARG_SPECS[command];
  if (!spec) return ['--help'];
  return [...new Set([...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help'])].sort();
}

function helpTopicWords(): string[] {
  return [...PUBLIC_COMMANDS, 'token'];
}

function completionWordsFor(command: string): string[] {
  if (command === 'completion') return ['zsh', 'bash', 'fish', ...completionOptionsFor(command)];
  if (command === 'help') return [...helpTopicWords(), ...completionOptionsFor(command)];
  return completionOptionsFor(command);
}


const COMPLETION_OPTION_DESCRIPTIONS: Record<string, string> = {
  '--all': 'Collect from the full available local history',
  '--api-base-url': 'Override AgentFeed API base URL',
  '--browser': 'Allow browser authorization in guarded environments',
  '--clipboard': 'Copy the review URL to clipboard',
  '--dry': 'Collect or preview without uploading',
  '--dry-run': 'Collect or preview without uploading',
  '--explain': 'Show how local work was collected',
  '--force': 'Bypass the local draft reuse guard',
  '--global': 'Use global Claude Code settings',
  '--help': 'Show command help',
  '-h': 'Show command help',
  '--id': 'Use a specific draft ID',
  '--json': 'Print machine-readable JSON output',
  '--latest': 'Use the newest local draft',
  '--no-clip': 'Do not copy the review URL',
  '--no-clipboard': 'Do not copy the review URL',
  '--no-git-check': 'Initialize even when no git repository is detected',
  '--no-open': 'Print the authorization URL instead of opening a browser',
  '--no-open-review': 'Do not open the private review URL',
  '--no-save': 'Do not persist credentials after login',
  '--no-save-cursor': 'Do not advance the collection cursor',
  '--no-upload': 'Keep the draft local instead of uploading',
  '--note': 'Attach a public-safe author note',
  '--open-review': 'Open the private review URL after upload',
  '--path': 'Scan a filesystem path',
  '--project': 'Use project Claude Code settings',
  '--project-name': 'Set the AgentFeed project name',
  '--remote': 'Validate preview through the API',
  '--run-configured-commands': 'Run trusted configured test/build commands',
  '--session-file': 'Read agent session metadata from a file',
  '--settings-path': 'Override the Claude Code settings path',
  '--since': 'Start the collection window',
  '--source': 'Select agent source',
  '--token': 'Read ingestion token from a value or stdin when value is -',
  '--token-stdin': 'Read ingestion token from stdin',
  '--until': 'End the collection window',
  '--upload': 'Upload after collecting',
  '--yes': 'Confirm the action without an interactive prompt',
  '-y': 'Confirm the action without an interactive prompt'
};

const COMMAND_COMPLETION_OPTION_DESCRIPTIONS: Record<string, Record<string, string>> = {
  commands: {
    '--json': 'Print a machine-readable command catalog'
  },
  login: {
    '--json': 'Print machine-readable login status',
    '--browser': 'Force browser authorization in guarded environments'
  },
  logout: {
    '--json': 'Print machine-readable logout status'
  },
  status: {
    '--json': 'Print machine-readable status diagnostics'
  },
  version: {
    '--json': 'Print the version as JSON'
  },
  collect: {
    '--json': 'Print machine-readable draft output',
    '--upload': 'Upload immediately after collecting'
  },
  share: {
    '--json': 'Print machine-readable share output',
    '--yes': 'Upload without an interactive confirmation',
    '-y': 'Upload without an interactive confirmation'
  },
  preview: {
    '--json': 'Print machine-readable draft preview'
  },
  publish: {
    '--json': 'Print machine-readable upload result',
    '--yes': 'Upload without an interactive confirmation',
    '-y': 'Upload without an interactive confirmation'
  },
  scan: {
    '--json': 'Print machine-readable privacy scan output'
  },
  hook: {
    '--dry-run': 'Preview hook changes without writing files',
    '--json': 'Print machine-readable hook result'
  },
  doctor: {
    '--json': 'Print machine-readable diagnostic checks'
  },
  drafts: {
    '--json': 'Print machine-readable draft summaries'
  },
  discard: {
    '--json': 'Print machine-readable discard result'
  },
  open: {
    '--json': 'Print machine-readable review URL handoff'
  }
};

function completionOptionDescription(command: string, optionName: string): string {
  return COMMAND_COMPLETION_OPTION_DESCRIPTIONS[command]?.[optionName]
    ?? COMPLETION_OPTION_DESCRIPTIONS[optionName]
    ?? `Option for agentfeed ${command}`;
}

function completionOptionRequiresValue(command: string, optionName: string): boolean {
  return COMMAND_ARG_SPECS[command]?.valueOptions?.includes(optionName) ?? false;
}

function fishQuote(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const COMPLETION_VALUE_PLACEHOLDERS: Record<string, string> = {
  '--api-base-url': 'API URL',
  '--id': 'draft ID',
  '--note': 'note',
  '--path': 'path',
  '--project-name': 'project name',
  '--session-file': 'path',
  '--settings-path': 'path',
  '--since': 'timestamp',
  '--source': 'source',
  '--token': 'token',
  '--until': 'timestamp'
};

const COMPLETION_VALUE_CHOICES: Record<string, readonly string[]> = {
  '--source': SUPPORTED_SOURCES,
  '--token': ['-']
};

const COMPLETION_FILE_VALUE_OPTIONS = new Set(['--path', '--session-file', '--settings-path']);

function completionValuePlaceholder(optionName: string): string {
  return COMPLETION_VALUE_PLACEHOLDERS[optionName] ?? 'value';
}

function completionValueChoices(optionName: string): readonly string[] {
  return COMPLETION_VALUE_CHOICES[optionName] ?? [];
}

function zshQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function zshOptionArgument(command: string, optionName: string): string {
  const description = completionOptionDescription(command, optionName).replace(/]/g, '\\]');
  const base = `${optionName}[${description}]`;
  if (!completionOptionRequiresValue(command, optionName)) return base;
  const placeholder = completionValuePlaceholder(optionName);
  const choices = completionValueChoices(optionName);
  if (choices.length) return `${base}:${placeholder}:(${choices.join(' ')})`;
  if (COMPLETION_FILE_VALUE_OPTIONS.has(optionName)) return `${base}:${placeholder}:_files`;
  return `${base}:${placeholder}:`;
}

function zshArgumentsCase(command: string): string {
  if (command === 'completion' || command === 'help') {
    return `    ${command}) compadd -- ${completionWordsFor(command).join(' ')} ;;`;
  }
  const options = completionOptionsFor(command);
  const entries = options
    .map((optionName, index) => {
      const suffix = index === options.length - 1 ? '' : ' \\';
      return `        ${zshQuote(zshOptionArgument(command, optionName))}${suffix}`;
    })
    .join('\n');
  return [
    `    ${command})`,
    '      _arguments \\',
    entries,
    '      ;;'
  ].join('\n');
}

function zshCompletionScript(): string {
  const commandEntries = PUBLIC_COMMANDS
    .map((command) => `    '${command}:${COMMAND_DESCRIPTIONS[command]}'`)
    .join('\n');
  const optionCases = PUBLIC_COMMANDS
    .map((command) => zshArgumentsCase(command))
    .join('\n');
  return `#compdef agentfeed

_agentfeed() {
  local -a commands
  commands=(
${commandEntries}
  )

  if (( CURRENT == 2 )); then
    _describe 'agentfeed command' commands
    return
  fi

  case "$words[2]" in
${optionCases}
    *) compadd -- --help ;;
  esac
}

_agentfeed "$@"
`;
}

function bashCompletionScript(): string {
  const commands = PUBLIC_COMMANDS.join(' ');
  const optionCases = PUBLIC_COMMANDS
    .map((command) => `    ${command}) options="${completionWordsFor(command).join(' ')}" ;;`)
    .join('\n');
  const sourceValues = SUPPORTED_SOURCES.join(' ');
  return `_agentfeed() {
  local cur prev command commands options
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  command="\${COMP_WORDS[1]}"
  commands="${commands}"

  if [[ COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return 0
  fi

  case "$prev" in
    --source) COMPREPLY=( $(compgen -W "${sourceValues}" -- "$cur") ); return 0 ;;
    --token) COMPREPLY=( $(compgen -W "-" -- "$cur") ); return 0 ;;
    --path|--session-file|--settings-path) COMPREPLY=( $(compgen -f -- "$cur") ); return 0 ;;
  esac

  case "$command" in
${optionCases}
    *) options="--help" ;;
  esac

  COMPREPLY=( $(compgen -W "$options" -- "$cur") )
}

complete -F _agentfeed agentfeed
`;
}

function fishCompletionScript(): string {
  const commandList = PUBLIC_COMMANDS.join(' ');
  const helpTopics = helpTopicWords().join(' ');
  const lines = [
    'complete -c agentfeed -f',
    ...PUBLIC_COMMANDS.map((command) => `complete -c agentfeed -n "not __fish_seen_subcommand_from ${commandList}" -a "${command}" -d "${COMMAND_DESCRIPTIONS[command]}"`),
    'complete -c agentfeed -n "__fish_seen_subcommand_from completion" -a "zsh bash fish" -d "Completion shell"',
    `complete -c agentfeed -n "__fish_seen_subcommand_from help" -a "${helpTopics}" -d "Help topic"`,
    ...PUBLIC_COMMANDS.flatMap((command) => completionOptionsFor(command).map((optionName) => {
      const description = fishQuote(completionOptionDescription(command, optionName));
      const choices = completionValueChoices(optionName);
      const valueHint = completionOptionRequiresValue(command, optionName) ? ' -r' : '';
      const choiceHint = choices.length ? ` -a ${fishQuote(choices.join(' '))}` : '';
      const fileHint = COMPLETION_FILE_VALUE_OPTIONS.has(optionName) ? ' -F' : '';
      if (optionName.startsWith('--')) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -l ${optionName.slice(2)}${valueHint}${choiceHint}${fileHint} -d ${description}`;
      }
      if (optionName.startsWith('-') && optionName.length === 2) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -s ${optionName.slice(1)}${valueHint}${choiceHint}${fileHint} -d ${description}`;
      }
      return '';
    }).filter(Boolean))
  ];
  return `${lines.join('\n')}\n`;
}

function completionScript(shell: string): string {
  switch (shell) {
    case 'zsh': return zshCompletionScript();
    case 'bash': return bashCompletionScript();
    case 'fish': return fishCompletionScript();
    default: throw new Error([
      `Unsupported completion shell: ${shell}`,
      'Supported shells: zsh, bash, fish',
      'Run: agentfeed completion --help'
    ].join('\n'));
  }
}

async function cmdCompletion(args: string[]) {
  const shell = args[0];
  if (!shell) {
    printCommandHelp('completion');
    return;
  }
  print(completionScript(shell));
}

async function cmdVersion(args: string[]) {
  if (flag(args, '--json')) {
    print(JSON.stringify({ version: AGENTFEED_CLI_VERSION }, null, 2));
    return;
  }
  print(AGENTFEED_CLI_VERSION);
}

function commandCatalogNextActions(): string[] {
  return ['agentfeed init', 'agentfeed login', 'agentfeed share --dry'];
}

const COMMAND_WORKFLOWS: Array<{ name: string; description: string; commands: string[] }> = [
  {
    name: 'Beginner setup',
    description: 'Connect one project and confirm the CLI is ready.',
    commands: ['agentfeed init', 'agentfeed login', 'agentfeed status']
  },
  {
    name: 'Daily share',
    description: 'Preview work first, then upload and open the private review.',
    commands: ['agentfeed share --dry', 'agentfeed share --yes --open-review']
  },
  {
    name: 'Draft review',
    description: 'Inspect pending drafts and publish the one you trust.',
    commands: ['agentfeed drafts', 'agentfeed preview --latest', 'agentfeed publish --latest --yes']
  },
  {
    name: 'Power user',
    description: 'Control source, window, and evidence before publishing.',
    commands: ['agentfeed collect --explain', 'agentfeed collect --source codex --all', 'agentfeed publish --latest --yes']
  },
  {
    name: 'Recovery',
    description: 'Diagnose setup, token, API, or agent-detection problems.',
    commands: ['agentfeed doctor', 'agentfeed status', 'agentfeed share --dry']
  }
];

function printCommandWorkflows(): void {
  print(`\n${ui.section('Guided workflows')}:`);
  for (const workflow of COMMAND_WORKFLOWS) {
    print(`  ${workflow.name}: ${workflow.description}`);
    for (const command of workflow.commands) print(`    ${ui.command(command)}`);
  }
}

async function cmdCommands(args: string[]) {
  const nextActions = commandCatalogNextActions();
  if (flag(args, '--json')) {
    print(JSON.stringify({
      next_actions: nextActions,
      workflows: COMMAND_WORKFLOWS,
      commands: COMMAND_GROUPS.map((group) => ({
        group: group.title,
        commands: group.commands.map((command) => commandCatalogEntry(command))
      }))
    }, null, 2));
    return;
  }
  print(ui.heading('AgentFeed commands'));
  printCommandCatalog();
  printCommandWorkflows();
  print(`\n${ui.section('Try this')}:`);
  printGuidedNextCommands(nextActions);
  print(`\nRun ${ui.command('agentfeed help <command>')} for command-specific options.`);
}

const PUBLIC_COMMANDS = [
  'help',
  'commands',
  'init',
  'login',
  'share',
  'collect',
  'preview',
  'publish',
  'open',
  'scan',
  'status',
  'doctor',
  'version',
  'hook',
  'drafts',
  'discard',
  'rotate',
  'logout',
  'completion'
] as const;

const COMMAND_DESCRIPTIONS: Record<(typeof PUBLIC_COMMANDS)[number], string> = {
  help: 'Show root or command-specific help',
  commands: 'List available AgentFeed commands',
  init: 'Initialize AgentFeed in the current project',
  login: 'Connect this machine through browser approval',
  share: 'Collect, preview, and optionally upload in one workflow',
  collect: 'Collect local agent work into a private review draft',
  preview: 'Preview a saved local draft',
  publish: 'Upload a saved draft as a private review draft',
  open: 'Open a trusted review URL from an uploaded draft',
  scan: 'Scan and redact public draft fields',
  status: 'Show credentials, project, and draft status',
  doctor: 'Run local diagnostics',
  version: 'Print the installed AgentFeed CLI version',
  hook: 'Install or remove agent hooks',
  drafts: 'List local draft summaries',
  discard: 'Delete a local draft',
  rotate: 'Replace the saved ingestion token',
  logout: 'Remove saved credentials',
  completion: 'Print shell completion script'
};

const COMMAND_EXAMPLES: Record<(typeof PUBLIC_COMMANDS)[number], string> = {
  help: 'agentfeed help share',
  commands: 'agentfeed commands',
  init: 'agentfeed init',
  login: 'agentfeed login',
  share: 'agentfeed share --dry',
  collect: 'agentfeed collect --explain',
  preview: 'agentfeed preview --latest',
  publish: 'agentfeed publish --latest --yes',
  open: 'agentfeed open --latest',
  scan: 'agentfeed scan --latest --dry-run',
  status: 'agentfeed status',
  doctor: 'agentfeed doctor',
  version: 'agentfeed version',
  hook: 'agentfeed hook install claude-code --dry-run',
  drafts: 'agentfeed drafts',
  discard: 'agentfeed discard --id <draft_id>',
  rotate: 'agentfeed rotate',
  logout: 'agentfeed logout',
  completion: 'agentfeed completion zsh'
};

const COMMAND_USAGE_OVERRIDES: Partial<Record<(typeof PUBLIC_COMMANDS)[number], string>> = {
  hook: 'agentfeed hook install|uninstall claude-code [options]',
  completion: 'agentfeed completion <shell>'
};

interface CommandOptionDetail {
  name: string;
  description: string;
  requires_value: boolean;
  value_hint?: string;
  value_choices?: readonly string[];
}

function commandOptionDetails(command: string): CommandOptionDetail[] {
  return completionOptionsFor(command).map((optionName) => {
    const requiresValue = completionOptionRequiresValue(command, optionName);
    return {
      name: optionName,
      description: completionOptionDescription(command, optionName),
      requires_value: requiresValue,
      ...(requiresValue ? { value_hint: completionValuePlaceholder(optionName) } : {}),
      ...(completionValueChoices(optionName).length ? { value_choices: [...completionValueChoices(optionName)] } : {})
    };
  });
}

function commandCatalogEntry(command: (typeof PUBLIC_COMMANDS)[number]): {
  name: string;
  description: string;
  usage: string;
  help_command: string;
  example_command: string;
  options: {
    flags: string[];
    value_options: string[];
    option_details: CommandOptionDetail[];
    conflicts: Array<[string, string]>;
    completion_words: string[];
  };
} {
  const spec = COMMAND_ARG_SPECS[command];
  return {
    name: command,
    description: COMMAND_DESCRIPTIONS[command],
    usage: COMMAND_USAGE_OVERRIDES[command] ?? `agentfeed ${command} [options]`,
    help_command: `agentfeed help ${command}`,
    example_command: COMMAND_EXAMPLES[command],
    options: {
      flags: [...(spec?.flags ?? [])],
      value_options: [...(spec?.valueOptions ?? [])],
      option_details: commandOptionDetails(command),
      conflicts: [...(spec?.conflicts ?? [])].map(([first, second]) => [first, second]),
      completion_words: completionWordsFor(command)
    }
  };
}

const COMMAND_GROUPS: Array<{ title: string; commands: Array<(typeof PUBLIC_COMMANDS)[number]> }> = [
  { title: 'Start', commands: ['help', 'commands', 'init', 'login', 'status'] },
  { title: 'Share work', commands: ['share', 'collect', 'preview', 'publish', 'open'] },
  { title: 'Privacy and drafts', commands: ['scan', 'drafts', 'discard'] },
  { title: 'Automation', commands: ['hook', 'completion'] },
  { title: 'Account and diagnostics', commands: ['doctor', 'version', 'rotate', 'logout'] }
];

const KNOWN_COMMANDS = new Set([
  'help',
  'commands',
  'init',
  'login',
  'logout',
  'status',
  'rotate',
  'version',
  'token',
  'collect',
  'share',
  'preview',
  'publish',
  'scan',
  'hook',
  'doctor',
  'drafts',
  'discard',
  'open',
  'completion'
]);

interface CommandArgSpec {
  flags?: readonly string[];
  valueOptions?: readonly string[];
  conflicts?: readonly (readonly [string, string])[];
  validatePositionals?: (positionals: string[]) => string | null;
}

function commandUsageError(message: string, command: string, suggestions: string[] = []): string {
  return [
    message,
    ...suggestions,
    commandHelpHint(command)
  ].join('\n');
}

function conflictingOptionsError(command: string, first: string, second: string): string {
  return [
    `Conflicting options for ${command}: ${first} and ${second}`,
    `Use only one of ${first} or ${second}.`,
    commandHelpHint(command)
  ].join('\n');
}

function flaglessOptionCommandSuggestion(command: string, positionals: string[], prefixPositionals: string[] = []): string | null {
  const spec = COMMAND_ARG_SPECS[command];
  if (!spec || positionals.length === 0) return null;
  const flagByBareName = new Map(
    (spec.flags ?? [])
      .filter((candidate) => candidate.startsWith('--'))
      .map((candidate) => [candidate.slice(2), candidate])
  );
  const suggestedFlags: string[] = [];
  for (const positional of positionals) {
    const flag = flagByBareName.get(positional);
    if (!flag) return null;
    suggestedFlags.push(flag);
  }
  return `agentfeed ${[command, ...prefixPositionals, ...suggestedFlags].join(' ')}`;
}

function flaglessOptionSuggestionLine(command: string, positionals: string[], prefixPositionals: string[] = []): string[] {
  const suggestion = flaglessOptionCommandSuggestion(command, positionals, prefixPositionals);
  return suggestion ? [`Did you mean: ${suggestion}`] : [];
}

function helpTopicError(topic: string): string {
  const suggestion = closestMatch(topic, PUBLIC_COMMANDS);
  return [
    `Unknown help topic: ${topic}`,
    ...(suggestion ? [`Did you mean: agentfeed help ${suggestion}`] : []),
    'Run: agentfeed help'
  ].join('\n');
}

const NO_POSITIONALS = (command: string) => (positionals: string[]) =>
  positionals.length
    ? commandUsageError(
      `Unexpected argument for ${command}: ${positionals[0]}`,
      command,
      flaglessOptionSuggestionLine(command, positionals)
    )
    : null;

function hookUsageMessage(): string {
  return [
    'Usage: agentfeed hook install|uninstall claude-code',
    'Run: agentfeed hook --help',
    'Run: agentfeed hook install claude-code --dry-run'
  ].join('\n');
}

function unsupportedHookTargetMessage(action = 'install', target?: string): string {
  const suggestion = target && (target === 'claude' || target.startsWith('claude-'))
    ? `Did you mean: agentfeed hook ${action} claude-code`
    : null;
  return [
    'Only claude-code hooks are supported.',
    ...(suggestion ? [suggestion] : []),
    'Run: agentfeed hook install claude-code --help'
  ].join('\n');
}

const COMMAND_ARG_SPECS: Record<string, CommandArgSpec> = {
  help: {
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return null;
      if (positionals[0] === 'token') {
        if (positionals.length === 1) return null;
        if (positionals.length === 2 && positionals[1] === 'rotate') return null;
        return commandUsageError(`Unexpected argument for help token: ${positionals[1]}`, 'help');
      }
      if (positionals.length > 1) return commandUsageError(`Unexpected argument for help: ${positionals[1]}`, 'help');
      return KNOWN_COMMANDS.has(positionals[0]) ? null : helpTopicError(positionals[0]);
    }
  },
  commands: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('commands')
  },
  init: {
    flags: ['--no-git-check', '--force', '--json'],
    valueOptions: ['--project-name'],
    validatePositionals: NO_POSITIONALS('init')
  },
  login: {
    flags: ['--token-stdin', '--no-save', '--no-open', '--browser', '--json'],
    valueOptions: ['--token', '--api-base-url'],
    validatePositionals: NO_POSITIONALS('login')
  },
  logout: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('logout')
  },
  status: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('status')
  },
  rotate: {
    flags: ['--browser', '--no-save', '--no-open'],
    valueOptions: ['--api-base-url'],
    validatePositionals: NO_POSITIONALS('rotate')
  },
  token: {
    flags: ['--browser', '--no-save', '--no-open'],
    valueOptions: ['--api-base-url'],
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return commandUsageError('Usage: agentfeed token rotate', 'token');
      if (positionals[0] !== 'rotate') return commandUsageError(`Unknown token subcommand: ${positionals[0]}`, 'token');
      if (positionals.length > 1) return commandUsageError(
        `Unexpected argument for token rotate: ${positionals[1]}`,
        'token',
        flaglessOptionSuggestionLine('token', positionals.slice(1), ['rotate'])
      );
      return null;
    }
  },
  collect: {
    flags: ['--dry', '--dry-run', '--all', '--force', '--run-configured-commands', '--explain', '--json', '--upload', '--open-review', '--no-open-review', '--no-save-cursor', '--no-upload'],
    valueOptions: ['--source', '--session-file', '--since', '--until'],
    conflicts: [['--upload', '--no-upload'], ['--dry', '--upload'], ['--dry-run', '--upload'], ['--open-review', '--no-open-review']],
    validatePositionals: NO_POSITIONALS('collect')
  },
  share: {
    flags: ['--dry', '--dry-run', '--yes', '-y', '--open-review', '--no-open-review', '--all', '--force', '--run-configured-commands', '--explain', '--no-save-cursor', '--no-clipboard', '--no-clip', '--json', '--clipboard'],
    valueOptions: ['--source', '--session-file', '--since', '--until', '--note'],
    conflicts: [
      ['--dry', '--yes'],
      ['--dry', '-y'],
      ['--dry-run', '--yes'],
      ['--dry-run', '-y'],
      ['--open-review', '--no-open-review'],
      ['--clipboard', '--no-clipboard'],
      ['--clipboard', '--no-clip']
    ],
    validatePositionals: NO_POSITIONALS('share')
  },
  preview: {
    flags: ['--latest', '--remote', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('preview')
  },
  publish: {
    flags: ['--latest', '--yes', '-y', '--json', '--clipboard', '--no-clipboard', '--open-review', '--no-open-review'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest'], ['--clipboard', '--no-clipboard'], ['--open-review', '--no-open-review']],
    validatePositionals: NO_POSITIONALS('publish')
  },
  scan: {
    flags: ['--latest', '--dry-run', '--dry', '--json'],
    valueOptions: ['--id', '--path'],
    conflicts: [['--id', '--latest'], ['--id', '--path'], ['--latest', '--path']],
    validatePositionals: NO_POSITIONALS('scan')
  },
  hook: {
    flags: ['--global', '--project', '--dry-run', '--json'],
    valueOptions: ['--settings-path'],
    conflicts: [['--global', '--project']],
    validatePositionals: (positionals) => {
      if (positionals.length < 2) return hookUsageMessage();
      if (positionals.length > 2) return commandUsageError(`Unexpected argument for hook: ${positionals[2]}`, 'hook');
      const [action, target] = positionals;
      if (action !== 'install' && action !== 'uninstall') {
        const suggestion = closestMatch(action, ['install', 'uninstall']);
        return [
          `Unknown hook action: ${action}`,
          ...(suggestion ? [`Did you mean: agentfeed hook ${suggestion} claude-code`] : []),
          hookUsageMessage()
        ].join('\n');
      }
      if (target !== 'claude-code') return unsupportedHookTargetMessage(action, target);
      return null;
    }
  },
  doctor: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('doctor')
  },
  version: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('version')
  },
  drafts: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('drafts')
  },
  discard: {
    flags: ['--latest', '--yes', '-y', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('discard')
  },
  open: {
    flags: ['--latest', '--json'],
    valueOptions: ['--id'],
    conflicts: [['--id', '--latest']],
    validatePositionals: NO_POSITIONALS('open')
  },
  completion: {
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return null;
      if (positionals.length > 1) return commandUsageError(`Unexpected argument for completion: ${positionals[1]}`, 'completion');
      const supportedShells = ['zsh', 'bash', 'fish'];
      if (supportedShells.includes(positionals[0])) return null;
      const suggestion = closestMatch(positionals[0], supportedShells);
      return [
          `Unsupported completion shell: ${positionals[0]}`,
          'Supported shells: zsh, bash, fish',
          ...(suggestion ? [`Did you mean: agentfeed completion ${suggestion}`] : []),
          'Run: agentfeed completion --help'
        ].join('\n');
    }
  }
};

function hasHelpFlag(args: string[]): boolean {
  return args.includes('--help') || args.includes('-h');
}

function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}
function commonPrefixLength(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) index += 1;
  return index;
}

function closestMatch(input: string, candidates: readonly string[]): string | null {
  let best: { candidate: string; distance: number; prefix: number } | null = null;
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);
    const prefix = commonPrefixLength(input, candidate);
    if (
      !best
      || distance < best.distance
      || (distance === best.distance && prefix > best.prefix)
    ) {
      best = { candidate, distance, prefix };
    }
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.floor(Math.max(input.length, best.candidate.length) / 3));
  return best.distance <= threshold ? best.candidate : null;
}

function commandHelpHint(command: string): string {
  if (command === 'token') return 'Run: agentfeed token rotate --help';
  if (command === 'help') return 'Run: agentfeed help --help';
  return `Run: agentfeed ${command} --help`;
}

function unknownCommandError(command: string): Error {
  const suggestion = closestMatch(command, PUBLIC_COMMANDS);
  return new Error([
    `Unknown command: ${command}`,
    ...(suggestion ? [`Did you mean: agentfeed ${suggestion}`] : []),
    'Run: agentfeed --help'
  ].join('\n'));
}


function leadingOptionExamples(optionName: string, rawOption: string, args: string[]): string[] {
  const inlineValue = rawOption.includes('=') ? rawOption.slice(rawOption.indexOf('=') + 1) : null;
  const nextValue = !rawOption.includes('=') && args[0] && !args[0].startsWith('-') && !KNOWN_COMMANDS.has(args[0])
    ? args[0]
    : null;
  const optionWithValue = inlineValue !== null || nextValue
    ? `${optionName} ${inlineValue ?? nextValue}`
    : optionName;
  switch (optionName) {
    case '--dry':
    case '--dry-run':
      return [
        'Try: agentfeed share --dry',
        'Try: agentfeed collect --dry-run --explain'
      ];
    case '--json':
      return [
        'Try: agentfeed status --json',
        'Try: agentfeed commands --json'
      ];
    case '--api-base-url':
      return [`Try: agentfeed login ${optionWithValue}`];
    case '--source':
      return [`Try: agentfeed collect ${optionWithValue} --explain`];
    case '--session-file':
      return [`Try: agentfeed collect ${optionWithValue} --explain`];
    case '--token-stdin':
      return ['Try: printf %s "$TOKEN" | agentfeed login --token-stdin'];
    case '--no-open':
      return ['Try: agentfeed login --no-open'];
    case '--open-review':
      return ['Try: agentfeed share --yes --open-review'];
    default:
      return [];
  }
}

function leadingOptionError(option: string, args: string[]): Error {
  const optionName = option.includes('=') ? option.slice(0, option.indexOf('=')) : option;
  const commandIndex = args.findIndex((arg) => KNOWN_COMMANDS.has(arg));
  const command = commandIndex >= 0 ? args[commandIndex] : null;
  const spec = command ? COMMAND_ARG_SPECS[command] : null;
  const acceptsOption = spec
    ? [...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help', '-h'].includes(optionName)
    : false;
  const valueTokens = commandIndex > 0 ? args.slice(0, commandIndex) : [];
  const valueSuffix = spec?.valueOptions?.includes(optionName) && !option.includes('=') && valueTokens[0] && !valueTokens[0].startsWith('-')
    ? ` ${valueTokens[0]}`
    : '';
  const reordered = command && acceptsOption
    ? `agentfeed ${command} ${option}${valueSuffix}`
    : null;
  return new Error([
    `Option appears before command: ${optionName}`,
    'AgentFeed uses command-first syntax: agentfeed <command> [options].',
    ...(reordered ? [`Use: ${reordered}`] : leadingOptionExamples(optionName, option, args)),
    ...(command ? [commandHelpHint(command)] : ['Run: agentfeed --help'])
  ].join('\n'));
}

function unknownOptionError(command: string, optionName: string, spec: CommandArgSpec): Error {
  const candidates = [...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help', '-h'];
  const suggestion = closestMatch(optionName, candidates);
  return new Error([
    `Unknown option: ${optionName}`,
    `Command: agentfeed ${command}`,
    ...(suggestion ? [`Did you mean: ${suggestion}`] : []),
    commandHelpHint(command)
  ].join('\n'));
}

function validateCommandArgs(command: string, args: string[]): void {
  const spec = COMMAND_ARG_SPECS[command];
  if (!spec) throw unknownCommandError(command);
  const flags = new Set([...(spec.flags ?? []), '--help', '-h']);
  const valueOptions = new Set(spec.valueOptions ?? []);
  const positionals: string[] = [];
  const seenOptions = new Set<string>();

  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (raw === '--') {
      throw new Error(commandUsageError(`Unexpected argument for ${command}: --`, command));
    }
    if (raw.startsWith('--')) {
      const equalsIndex = raw.indexOf('=');
      const name = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
      if (valueOptions.has(name)) {
        seenOptions.add(name);
        if (equalsIndex >= 0) {
          if (raw.slice(equalsIndex + 1).length === 0) throw new Error(commandUsageError(`${name} requires a value.`, command));
        } else {
          const value = args[i + 1];
          if (!value || value.startsWith('--')) throw new Error(commandUsageError(`${name} requires a value.`, command));
          i += 1;
        }
        continue;
      }
      if (flags.has(name)) {
        seenOptions.add(name);
        if (equalsIndex >= 0) throw new Error(commandUsageError(`${name} does not accept a value.`, command));
        continue;
      }
      throw unknownOptionError(command, name, spec);
    }
    if (raw.startsWith('-')) {
      if (flags.has(raw)) {
        seenOptions.add(raw);
        continue;
      }
      throw unknownOptionError(command, raw, spec);
    }
    positionals.push(raw);
  }

  const positionalError = spec.validatePositionals?.(positionals);
  if (positionalError) throw new Error(positionalError);

  for (const [first, second] of spec.conflicts ?? []) {
    if (seenOptions.has(first) && seenOptions.has(second)) {
      throw new Error(conflictingOptionsError(command, first, second));
    }
  }
}

function printCommandCatalog(): void {
  print(`\n${ui.section('Commands')}:`);
  for (const group of COMMAND_GROUPS) {
    print(`  ${group.title}:`);
    for (const command of group.commands) {
      print(`    ${ui.command(command.padEnd(10))} ${COMMAND_DESCRIPTIONS[command]}`);
    }
  }
}

function printHelp(): void {
  print(ui.heading('Usage: agentfeed <command> [options]'));
  print(`Version: ${AGENTFEED_CLI_VERSION}`);
  print(`\n${ui.section('Global options')}:\n  agentfeed --help\n  agentfeed --version\n  agentfeed -v\n  agentfeed version`);
  print(`\n${ui.section('Help')}:\n  agentfeed help\n  agentfeed commands\n  agentfeed help <command>\n  agentfeed <command> help`);
  print(`\n${ui.section('Quickstart')}:\n  agentfeed init\n  agentfeed login\n  agentfeed share --dry\n  agentfeed share --yes --open-review`);
  print(`\n${ui.section('Headless login')}:\n  printf %s "$TOKEN" | agentfeed login --token-stdin\n  printf %s "$TOKEN" | agentfeed login --token - --no-save`);
  print(`\n${ui.section('Daily workflow')}:\n  agentfeed share\n  agentfeed share --yes\n  agentfeed share --dry\n  agentfeed share --note "Fixed auth flow"\n  agentfeed status`);
  print(`\n${ui.section('Draft review')}:\n  agentfeed collect --explain\n  agentfeed preview --latest\n  agentfeed publish --latest --yes\n  agentfeed open --latest`);
  print(`\n${ui.section('Advanced and diagnostics')}:\n  agentfeed doctor\n  agentfeed scan --id <draft_id> --dry-run\n  agentfeed hook install claude-code\n  agentfeed drafts\n  agentfeed discard --id <draft_id>\n  agentfeed rotate\n  agentfeed logout`);
  print(`\n${ui.section('Shell completion')}:\n  agentfeed completion zsh\n  agentfeed completion bash\n  agentfeed completion fish`);
  printCommandCatalog();
  print(`\nRun ${ui.command('agentfeed <command> --help')} for command-specific options.`);
}

function printCommandHelp(command: string): void {
  if (command === 'token') {
    print(`Usage: agentfeed token rotate [options]

Compatibility alias for:
  agentfeed rotate

When to use:
  Prefer agentfeed rotate unless another script still calls this alias.

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the auth URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help`);
    return;
  }

  const helps: Record<string, string> = {
    help: `Usage: agentfeed help [command]

Show AgentFeed root help or command-specific help.

When to use:
  Use this when you forget a command or want command-specific options.

Examples:
  agentfeed help
  agentfeed help collect
  agentfeed collect help
  agentfeed help token rotate

Equivalent forms:
  agentfeed --help
  agentfeed <command> --help

Options:
  --help, -h                Show this help`,
    commands: `Usage: agentfeed commands [options]

List available AgentFeed commands grouped by workflow area.

When to use:
  Use this to pick the right command for setup, sharing, or debugging.

Equivalent forms:
  agentfeed help
  agentfeed --help

Options:
  --json                    Print machine-readable command catalog
  --help, -h                Show this help`,
    version: `Usage: agentfeed version [options]

Print the installed AgentFeed CLI version.

When to use:
  Use this for bug reports, support, and release checks.

Equivalent forms:
  agentfeed --version
  agentfeed -v

Options:
  --json                    Print machine-readable version output
  --help, -h                Show this help`,
    init: `Usage: agentfeed init [options]

Initialize .agentfeed/config.json in the current git project.

When to use:
  Run once in each project before collecting AgentFeed drafts.

Options:
  --project-name <name>     Override the detected project name
  --no-git-check            Allow initialization outside a git repository
  --force                   Recreate config after backing up existing files
  --json                    Print machine-readable initialization result
  --help, -h                Show this help`,
    login: `Usage: agentfeed login [options]

Connect this machine to AgentFeed.
Without token input, login starts safe browser approval.

When to use:
  Run before uploading or after status says the token is missing.

Options:
  --no-open                 Print the auth URL instead of opening a browser
  --browser                 Allow browser login even in CI-like environments
  --no-save                 Do not persist credentials
  --api-base-url <url>      Override the AgentFeed API base URL
  --token-stdin             Read an ingestion token from stdin
  --token -                 Read an ingestion token from stdin
  --json                    Print machine-readable token-input login result
  --help, -h                Show this help

Examples:
  agentfeed login
  agentfeed login --no-open
  printf %s "$TOKEN" | agentfeed login --token-stdin
  printf %s "$TOKEN" | agentfeed login --token-stdin --json
  agentfeed login --api-base-url http://localhost:8001/v1

Safety:
  Prefer --token-stdin so tokens do not appear in shell history.
  Remote http API URLs need AGENTFEED_ALLOW_INSECURE_API=1.
  Use that override only for development.`,
    logout: `Usage: agentfeed logout [options]

Remove saved AgentFeed credentials from this machine.

When to use:
  Run when switching accounts or disconnecting this device.

Options:
  --json                    Print machine-readable logout status
  --help, -h                Show this help

Examples:
  agentfeed logout
  agentfeed logout --json
  agentfeed status

Safety:
  Logout removes AgentFeed credentials saved by the CLI.
  If AGENTFEED_TOKEN is set in your shell, unset it separately.
  Rotate that environment secret if needed.
  Run agentfeed status after logout to confirm no active token remains.`,
    status: `Usage: agentfeed status

Show credential, API, project, hook, draft, and collection cursor status.

When to use:
  Run when setup feels stuck or before sharing from a new shell.

Options:
  --json                    Print machine-readable status
  --help, -h                Show this help`,
    rotate: `Usage: agentfeed rotate [options]

Replace the saved ingestion token through browser approval.

When to use:
  Run when a token expires, leaks, or belongs to the wrong account.

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the auth URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help

Examples:
  agentfeed rotate
  agentfeed rotate --no-open
  agentfeed rotate --browser

Safety:
  Rotation revokes the previous saved token when AgentFeed can verify it.
  If AGENTFEED_TOKEN is set in your shell, update it separately.
  Unset the environment token if you want the saved token to apply.`,
    collect: `Usage: agentfeed collect [options]

Collect local agent work into a private review draft.
By default, collect saves locally and does not upload.
Omit --source to auto-detect Claude/Codex/Cursor/Gemini sessions and plugins.

When to use:
  Use for advanced collection control before previewing or publishing.

Common options:
  --source <source>         Override source (auto-detect is default)
      Values: claude-code, codex, cursor, gemini-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --dry, --dry-run          Keep draft local; collect uploads only with --upload
  --explain                 Include collection source/quality diagnostics
  --run-configured-commands Run configured local evidence commands

Advanced options:
  --json                    Print the draft JSON
  --upload                  Upload after collecting
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-save-cursor          Do not advance the collection cursor
  --no-upload               Suppress legacy auto_upload reminder
  --help, -h                Show this help

Examples:
  agentfeed collect --explain
  agentfeed collect --dry-run --explain
  agentfeed collect --source codex --session-file ~/.codex/session.jsonl --all
  agentfeed collect --json --no-save-cursor`,
    share: `Usage: agentfeed share [options]

Collect, preview, and optionally upload a private review draft.
Use this as the daily one-command workflow.
Omit --source to auto-detect Claude/Codex/Cursor/Gemini sessions and plugins.

When to use:
  Use after an AI coding session to make a reviewable worklog.

Options:
  --yes, -y                 Upload without interactive confirmation
  --dry, --dry-run          Collect and preview only; do not upload
  --source <source>         Override source (auto-detect is default)
      Values: claude-code, codex, cursor, gemini-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --explain                 Include collection source/quality diagnostics
  --no-save-cursor          Do not advance the collection cursor after upload
  --note <text>             Attach a user note to the draft
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-clipboard, --no-clip Do not copy the review URL
  --json                    Print machine-readable output
  --clipboard               Copy review URL when --json is used
  --run-configured-commands Run configured local evidence commands
  --help, -h                Show this help

Examples:
  agentfeed share --dry
  agentfeed share --dry --explain
  agentfeed share --dry --no-save-cursor
  agentfeed share --note "Fixed auth flow"
  agentfeed share --yes --open-review`,
    preview: `Usage: agentfeed preview [options]

Render a saved local draft preview.

When to use:
  Use before publishing to inspect the public-safe draft content.

Options:
  --latest                  Preview the newest local draft (default)
  --id <draft_id>           Preview a specific draft
  --json                    Print the local draft JSON with next actions
  --remote                  Validate/render preview through the API
  --help, -h                Show this help`,
    publish: `Usage: agentfeed publish [options]

Upload a saved local draft as a private AgentFeed review draft.

When to use:
  Use after previewing a local draft and logging in.

Options:
  --latest                  Publish the newest local draft (default)
  --id <draft_id>           Publish a specific draft
  --yes, -y                 Upload without interactive confirmation
  --json                    Print machine-readable upload output
  --clipboard               Copy review URL when --json is used
  --no-clipboard            Do not copy the review URL
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --help, -h                Show this help

Examples:
  agentfeed publish --latest --yes
  agentfeed publish --id draft_20260606_120000_abcd --yes --open-review
  agentfeed publish --latest --json --clipboard`,
    scan: `Usage: agentfeed scan [options]

Scan and redact public fields before sharing.

When to use:
  Use when a draft may contain secrets or sensitive project details.

Options:
  --latest                  Scan the newest local draft (default)
  --id <draft_id>           Scan a specific draft
  --path <path>             Scan changed-area labels from a path's git state
  --dry-run, --dry          Report findings without modifying a draft
  --json                    Print machine-readable scan output
  --help, -h                Show this help

Examples:
  agentfeed scan --latest --dry-run
  agentfeed scan --id draft_20260606_120000_abcd
  agentfeed scan --path .`,
    hook: `Usage: agentfeed hook install|uninstall claude-code [options]

Install or remove the AgentFeed Claude Code hook.

When to use:
  Use to capture Claude Code sessions automatically for richer drafts.

Options:
  --global                  Modify the global Claude Code settings
  --project                 Use project settings (default)
  --settings-path <path>    Override the Claude Code settings path
  --dry-run                 Print intended install changes without writing
  --json                    Print machine-readable hook result
  --help, -h                Show this help

Examples:
  agentfeed hook install claude-code --dry-run
  agentfeed hook install claude-code
  agentfeed hook uninstall claude-code`,
    doctor: `Usage: agentfeed doctor

Run local AgentFeed diagnostics for credentials, API reachability,
project config, git, and agent signals.

When to use:
  Run when collection, login, upload, or agent detection looks wrong.

Options:
  --json                    Print machine-readable diagnostics
  --help, -h                Show this help`,
    drafts: `Usage: agentfeed drafts [options]

List saved local draft summaries and next actions.

When to use:
  Use to find pending drafts and the next publish or preview command.

Options:
  --json                    Print machine-readable draft summaries
  --help, -h                Show this help`,
    discard: `Usage: agentfeed discard [options]

Delete a saved local draft after explicit confirmation.

When to use:
  Use to remove stale, duplicate, or unwanted local drafts.

Options:
  --latest                  Discard the newest local draft (default)
  --id <draft_id>           Discard a specific draft
  --yes, -y                 Delete without the confirmation preview
  --json                    Print machine-readable discard status
  --help, -h                Show this help`,
    open: `Usage: agentfeed open [options]

Reopen a trusted review URL from a previously uploaded draft.

When to use:
  Use after publishing when you need to return to the review page.

Options:
  --latest                  Open the newest uploaded draft (default)
  --id <draft_id>           Open a specific draft's review URL
  --json                    Print machine-readable review URL handoff status
  --help, -h                Show this help

Examples:
  agentfeed open --latest
  agentfeed open --id draft_20260606_120000_abcd`,
    completion: `Usage: agentfeed completion <shell>

Print a shell completion script for AgentFeed commands and options.

When to use:
  Use once per shell to enable tab completion.

Supported shells: zsh, bash, fish

Examples:
  agentfeed completion zsh > ~/.zsh/completions/_agentfeed
  agentfeed completion bash > agentfeed.bash
  agentfeed completion fish > agentfeed.fish

Install:
  agentfeed completion zsh > _agentfeed
  agentfeed completion bash > agentfeed.bash
  agentfeed completion fish > agentfeed.fish
  Move the generated file into your shell completion directory.
  Restart your shell after installing completions.

Options:
  --help, -h                Show this help`
  };

  const text = helps[command];
  if (!text) throw new Error(`Unknown command: ${command}`);
  print(text);
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

function isTrailingHelpAlias(command: string, args: string[]): boolean {
  if (args.length === 1 && args[0] === 'help') return true;
  return command === 'token' && args.length === 2 && args[0] === 'rotate' && args[1] === 'help';
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command.startsWith('-') && command !== '--version' && command !== '-v') {
    throw leadingOptionError(command, args);
  }
  if (hasHelpFlag(args)) {
    if (!KNOWN_COMMANDS.has(command)) throw unknownCommandError(command);
    printCommandHelp(command);
    return;
  }
  if (command === 'help') {
    validateCommandArgs(command, args);
    printHelpTopic(args);
    return;
  }
  if (isTrailingHelpAlias(command, args)) {
    if (!KNOWN_COMMANDS.has(command)) throw unknownCommandError(command);
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
      throw unknownCommandError(command);
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
