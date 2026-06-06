#!/usr/bin/env node
import { rm } from 'node:fs/promises';
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
import { detectAgentSignals, formatAgentSignalLines } from '../collectors/agent-discovery.js';
import { changedAreas } from '../summary/changed-areas.js';
import { hasAgentFeedHook, installClaudeCodeHook, uninstallClaudeCodeHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { formatMetricsRow, formatPrivacyPolicyLines, formatSharePreview, parseShareArgs, privacyPolicySummary } from './share.js';
import { parseAgentSource } from './source.js';
import { readJson, pathExists } from '../utils/fs.js';
import { openBrowser } from '../utils/open-browser.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { draftPaths } from '../draft/paths.js';
import * as ui from './ui.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function err(text = '') { process.stderr.write(`${text}\n`); }

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
      if (!ok) handoff.clipboard.warning = 'Review URL was not copied to clipboard. Copy upload.review_url manually.';
    }));
  }
  if (options.open) {
    handoff.browser.requested = true;
    tasks.push(safeBooleanAction(() => openBrowser(reviewUrl)).then((ok) => {
      handoff.browser.ok = ok;
      if (!ok) handoff.browser.warning = 'Review URL could not be opened automatically. Open upload.review_url manually.';
    }));
  }
  await Promise.all(tasks);
  return handoff;
}

function printReviewUrlHandoff(handoff: ReviewUrlHandoff, reviewUrl: string): void {
  if (handoff.clipboard.requested) {
    if (handoff.clipboard.ok) print('Review URL copied to clipboard.');
    else print(`Warning: ${handoff.clipboard.warning ?? 'Review URL was not copied to clipboard. Copy it manually.'}`);
  }
  if (handoff.browser.requested && !handoff.browser.ok) {
    print(`Warning: ${handoff.browser.warning ?? 'Review URL could not be opened automatically. Open it manually.'}`);
    print(reviewUrl);
  }
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

async function requireApiCompatibilityBeforeUpload(apiBaseUrl: string): Promise<ApiMetadata> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible && result.data) return result.data;
  throw new Error(`API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)}. Run agentfeed doctor for details before uploading drafts.`);
}

async function requireIngestionTokenBeforeUpload(credentials: AgentFeedCredentials): Promise<void> {
  const result = await checkIngestionToken(credentials);
  if (result.ok) return;
  throw new Error(`Ingestion token check failed for ${result.url}: ${apiCheckFailureDetail(result)}. Run agentfeed login or agentfeed rotate before uploading drafts.`);
}

async function requireUploadPreflight(credentials: AgentFeedCredentials): Promise<ApiMetadata> {
  const metadata = await requireApiCompatibilityBeforeUpload(credentials.api_base_url);
  await requireIngestionTokenBeforeUpload(credentials);
  return metadata;
}

async function requireApiCompatibilityBeforeCredentialSave(apiBaseUrl: string): Promise<void> {
  const result = await checkApiCompatibility(apiBaseUrl);
  if (result.compatible) return;
  throw new Error(`API compatibility check failed for ${result.url}: ${apiCompatibilityFailureDetail(result)}. Run agentfeed doctor for details before saving credentials.`);
}

async function readStdinText(): Promise<string> {
  let text = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) text += chunk;
  return text;
}

async function readTokenFromStdin(): Promise<string> {
  const token = (await readStdinText()).trim();
  if (!token) throw new Error('No token received on stdin. Pipe a token with: printf %s "$AGENTFEED_TOKEN" | agentfeed login --token-stdin');
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
  print('Upload confirmation required.');
  print('No data was uploaded to AgentFeed.');
  if (options.cacheReuseReason) print(`Saved private review cache cannot be reused: ${cachedUploadReuseReasonLabel(options.cacheReuseReason)}.`);
  print();
  print(`Draft: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Title: ${draft.worklog.title}`);
  print(`Privacy: ${draft.privacy_scan.status} · findings ${draft.privacy_scan.findings.length}`);
  print();
  print(`Upload after reviewing this draft:
  ${command}`);
  if (extraCommand) print(`Or collect and upload in one command:
  ${extraCommand}`);
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

function formatPrivacyScanReport(input: PublicScanFields, redacted: PublicScanFields, scan: ReturnType<typeof scanAndRedactFields>['scan'], options: { dryRun?: boolean } = {}): string {
  const lines = [`Privacy: ${scan.status}`, `Findings: ${scan.findings.length}`];
  if (options.dryRun) lines.push('Dry run: draft not modified.');
  if (scan.findings.length) {
    lines.push('Findings detail:');
    for (const finding of scan.findings) {
      lines.push(`- [${finding.severity}] ${finding.type}${finding.field ? ` at ${finding.field}` : ''} -> ${finding.sample_redacted ?? '[REDACTED]'}`);
    }
  }
  const previews = redactedFieldPreviews(input, redacted);
  if (previews.length) {
    lines.push('Redacted preview:');
    for (const preview of previews) lines.push(`- ${preview.field}: ${preview.value}`);
  }
  return lines.join('\n');
}

async function resolveDraftId(cwd: string, args: string[]): Promise<string> {
  const id = option(args, '--id');
  if (id) return id;
  const latest = await findLatestDraft(cwd);
  if (!latest) throw new Error('No local drafts found. Run: agentfeed collect');
  return latest.id;
}

async function cmdInit(args: string[]) {
  const result = await initProject({ cwd: process.cwd(), projectName: option(args, '--project-name'), noGitCheck: flag(args, '--no-git-check') });
  print('AgentFeed initialized.\n');
  print(`Project: ${result.config.project.name}`);
  print(`Visibility: ${result.config.project.visibility}`);
  print('Config: .agentfeed/config.json\n');
  print('Next:\n  agentfeed login\n  agentfeed hook install claude-code');
}

async function cmdLogin(args: string[]) {
  const tokenOption = option(args, '--token');
  const tokenFromStdin = flag(args, '--token-stdin') || tokenOption === '-';
  if (tokenOption && tokenOption !== '-' && tokenFromStdin) {
    throw new Error('Use only one token input method: --token -, or --token-stdin.');
  }
  if (tokenOption && tokenOption !== '-' && process.env.AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN !== '1') {
    throw new Error('Literal token input through --token <token> is disabled because argv can leak through shell history and process listings. Pipe the token instead: printf %s "$TOKEN" | agentfeed login --token-stdin. For local throwaway development only, set AGENTFEED_ALLOW_UNSAFE_ARGV_TOKEN=1.');
  }
  const token = tokenFromStdin ? await readTokenFromStdin() : tokenOption;
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  if (!token) {
    const existing = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open'), save: !noSave, cwd: process.cwd(), storedApiBaseUrl: existing.credentials?.api_base_url, allowCiBrowser: flag(args, '--browser') });
    print(noSave ? '\nAgentFeed browser login complete (not saved).\n' : '\nAgentFeed browser login complete.\n');
    print(`API: ${creds.api_base_url}`);
    if (creds.token_expires_at) print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
    if (!noSave) {
      const saved = await loadCredentialsWithMetadata({ cwd: process.cwd() });
      for (const warning of saved.warnings) print(`Warning: ${warning}`);
    }
    print(noSave
      ? 'No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.'
      : 'Next:\n  agentfeed status');
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
  print(noSave ? 'AgentFeed token loaded for this command only (not saved).\n' : 'AgentFeed credentials saved.\n');
  print(`API: ${creds.api_base_url}`);
  if (creds.token_expires_at) print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
  if (!noSave) {
    const saved = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    for (const warning of saved.warnings) print(`Warning: ${warning}`);
  }
  print(noSave
    ? 'No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.'
    : 'Next:\n  agentfeed status');
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
  print(`${message}\n`);
  print(`API: ${creds.api_base_url}`);
  if (creds.token_expires_at) print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
  print(noSave
    ? 'No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.'
    : 'Saved replacement token. Next:\n  agentfeed status');
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

async function cmdStatus() {
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
  const health = diagnostics.invalidApiBaseUrl
    ? 'attention needed'
    : !hasToken
    ? 'setup needed'
    : !config
      ? 'project setup needed'
      : allWarnings.length || pending > 0
        ? 'attention needed'
        : 'ready';

  print(ui.heading('AgentFeed status'));
  print(`Health: ${health === 'ready' ? ui.good(health) : ui.warn(health)}`);
  print();
  print(ui.section('Account'));
  print(`User/token: ${hasToken ? 'configured' : 'missing'}`);
  print(`User/token source: ${credentialSourceLabel(credentialResolution.token_source)}`);
  print(`Credential store: ${credentialStoreLabel(credentialResolution.credential_store)}`);
  print(`Credentials file: ${credentialResolution.credentials_file_exists ? credentialResolution.credentials_file_path : 'missing'}`);
  if (creds?.token_expires_at) {
    print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
    const warning = tokenExpiryWarning(creds.token_expires_at);
    if (warning) print(ui.warn(`Warning: ${warning}`));
  }
  print();
  print(ui.section('API'));
  print(`API base URL: ${credentialResolution.api_base_url ?? creds?.api_base_url ?? await resolveApiBaseUrl()}`);
  if (credentialResolution.api_base_url_source) {
    print(`API base URL source: ${apiBaseSourceLabel(credentialResolution.api_base_url_source, credentialResolution.api_base_url_source_detail)}`);
  }
  for (const warning of allWarnings) print(ui.warn(`Warning: ${warning}`));
  print();
  print(ui.section('Project'));
  print(`Project initialized: ${config ? 'yes' : 'no'}`);
  if (config) print(`Project name: ${config.project.name}`);
  const git = await collectGitMetrics(process.cwd());
  print(`Git repository: ${git.branch || git.head_commit ? 'yes' : 'no'}`);
  print(`Claude Code hook: ${hook}`);
  print();
  print(ui.section('Collection'));
  print(`Local drafts count: ${drafts.length}`);
  print(`Pending upload count: ${pending}`);
  print(`Last collection cursor: ${formatCollectionCursor(collectionState.last_collected_at)}`);
  print(`Next default collection since: ${nextDefaultCollectionSince(collectionState.last_collected_at)}`);
  if (pending > 0 && collectionState.last_collected_at) {
    print(ui.warn('Warning: pending local drafts exist while a collection cursor is set; publish/discard them or use --all/--since if the next collect looks empty.'));
  }
  print();
  print(ui.section('Next'));
  if (!creds) {
    print(`  ${ui.command('agentfeed login')}`);
  } else if (!config) {
    print(`  ${ui.command('agentfeed init')}`);
  } else if (pending > 0) {
    print(`  ${ui.command('agentfeed publish --latest --yes')}`);
    print(`  ${ui.command('agentfeed discard --latest')}`);
  } else {
    print(`  ${ui.command('agentfeed share --yes')}`);
  }
}

async function cmdLogout(args: string[]) {
  const result = await deleteSavedCredentials();
  const envTokenActive = Boolean(process.env.AGENTFEED_TOKEN);
  if (flag(args, '--json')) {
    print(JSON.stringify({
      credentials_file_deleted: result.credentials_file_deleted,
      credentials_file_path: result.credentials_file_path,
      keychain_deleted: result.keychain_deleted,
      environment_token_active: envTokenActive,
      warnings: [
        ...result.warnings,
        ...(envTokenActive ? ['AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.'] : [])
      ]
    }, null, 2));
    return;
  }
  print(result.credentials_file_deleted ? 'AgentFeed saved credentials removed.' : 'No saved AgentFeed credentials were found.');
  if (result.keychain_deleted === true) print('OS keychain token removed.');
  if (result.keychain_deleted === false) print('Warning: OS keychain token could not be removed automatically.');
  for (const warning of result.warnings) print(`Warning: ${warning}`);
  if (envTokenActive) {
    print('Warning: AGENTFEED_TOKEN is still set in this shell; unset it or update your shell/secret manager to finish logout.');
  }
  print('Next:\n  agentfeed status');
}

async function cmdCollect(args: string[]) {
  const source = parseAgentSource(option(args, '--source'));
  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source, sessionFile: option(args, '--session-file') ?? null, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), runConfiguredCommands: flag(args, '--run-configured-commands') });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);
  if (flag(args, '--json')) {
    if (flag(args, '--upload')) {
      const creds = await loadCredentials();
      if (!creds) throw new Error('AgentFeed token is missing. Run: agentfeed login');
      const metadata = await requireUploadPreflight(creds);
      const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds, reviewBaseUrl: metadata.review_base_url });
      draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), draft.id));
      if (flag(args, '--open-review')) {
        draft.upload.handoff = await handoffReviewUrl(result.review_url, { copy: false, open: true, apiBaseUrl: creds.api_base_url, reviewBaseUrl: result.review_base_url ?? metadata.review_base_url });
      }
    }
    if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    print(JSON.stringify(draft, null, 2));
    return;
  }
  print(ui.heading(collection.reusedExisting ? 'AgentFeed draft reused' : 'AgentFeed draft ready'));
  print(collection.reusedExisting ? 'Existing matching draft reused.\n' : 'Draft created.\n');
  print(ui.section('Summary'));
  print(`ID: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Privacy: ${draft.privacy_scan.status}`);
  print(`Metrics: ${formatMetricsRow(draft)}`);
  if (flag(args, '--explain')) print(`\n${formatCollectionExplain(draft)}`);
  print();
  print(ui.section('Next'));
  print(`Preview:\n  agentfeed preview --id ${draft.id}\n`);
  print(`Upload:\n  agentfeed publish --id ${draft.id} --yes`);
  if (flag(args, '--upload')) {
    await cmdPublish(['--id', draft.id, '--yes', ...(flag(args, '--open-review') ? ['--open-review'] : []), ...(flag(args, '--no-open-review') ? ['--no-open-review'] : [])]);
  } else {
    const config = await loadProjectConfig(process.cwd());
    if (!flag(args, '--no-upload') && config.collection.auto_upload) {
      print('Note: collection.auto_upload is ignored by collect for safety. Use agentfeed collect --upload to upload explicitly.');
    }
  }
  if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
}

async function cmdShare(args: string[]) {
  const opts = parseShareArgs(args);
  const creds = opts.dryRun ? null : await loadCredentials();
  if (!opts.dryRun && !creds) throw new Error('AgentFeed token is missing. Run: agentfeed login');

  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source: opts.source, sessionFile: opts.sessionFile, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), note: opts.note, runConfiguredCommands: opts.runConfiguredCommands, skipConfiguredCommands: opts.dryRun });
  let draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);

  if (opts.json) {
    if (opts.dryRun) {
      print(JSON.stringify({ dry_run: true, reused_existing_draft: collection.reusedExisting, draft, privacy_policy: privacyPolicySummary(draft) }, null, 2));
      return;
    }
    const metadata = await requireUploadPreflight(creds!);
    const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds!, reviewBaseUrl: metadata.review_base_url });
    draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), draft.id));
    await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    const handoff = await handoffReviewUrl(result.review_url, {
      copy: shouldCopyReviewUrl({ json: true, noClipboard: opts.noClipboard, clipboard: flag(args, '--clipboard') }),
      open: await shouldOpenReviewAfterUpload(opts.openReview, { respectConfig: false, noOpen: opts.noOpenReview }),
      apiBaseUrl: creds!.api_base_url,
      reviewBaseUrl: result.review_base_url ?? metadata.review_base_url
    });
    print(JSON.stringify({ dry_run: false, reused_existing_draft: collection.reusedExisting, draft_id: draft.id, draft, upload: result, privacy_policy: privacyPolicySummary(draft), handoff }, null, 2));
    return;
  }

  if (collection.reusedExisting) print(`Reusing existing matching draft: ${draft.id}\n`);
  print(formatSharePreview(draft));
  print();

  if (opts.dryRun) {
    print(`Dry run complete. Local draft kept: ${draft.id}`);
    print(`Publish later:
  agentfeed publish --id ${draft.id} --yes`);
    return;
  }

  if (shouldRequireUploadConfirmation({ yes: opts.yes })) {
    printUploadConfirmationRequired(draft, `agentfeed publish --id ${draft.id} --yes`, 'agentfeed share --yes');
    return;
  }

  const metadata = await requireUploadPreflight(creds!);
  const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds!, reviewBaseUrl: metadata.review_base_url });
  await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
  print(result.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.');
  print(`Status: ${result.status}`);
  print(`Review URL:
${result.review_url}`);
  printReviewUrlHandoff(await handoffReviewUrl(result.review_url, {
    copy: shouldCopyReviewUrl({ noClipboard: opts.noClipboard }),
    open: await shouldOpenReviewAfterUpload(opts.openReview, { noOpen: opts.noOpenReview }),
    apiBaseUrl: creds!.api_base_url,
    reviewBaseUrl: result.review_base_url ?? metadata.review_base_url
  }), result.review_url);
}

async function cmdPreview(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), id));
  if (flag(args, '--remote')) {
    const creds = await loadCredentials();
    if (!creds) throw new Error('AgentFeed token is missing. Run: agentfeed login, or pipe a token with: printf %s "$TOKEN" | agentfeed login --token-stdin');
    await requireApiCompatibilityBeforeUpload(creds.api_base_url);
    const remote = await previewDraftRemote(draft, creds);
    print(flag(args, '--json') ? JSON.stringify(remote, null, 2) : `Remote preview: ${remote.valid ? 'valid' : 'invalid'}\nWarnings: ${remote.warnings.length ? remote.warnings.join(', ') : 'none'}\nTitle: ${String(remote.preview.title ?? draft.worklog.title)}`);
    return;
  }
  if (flag(args, '--json')) { print(JSON.stringify(draft, null, 2)); return; }
  print('┌─────────────────────────────────────────────┐');
  print(`│ @local · ${draft.worklog.agent} · ${draft.project.name}`);
  print('│');
  print(`│ ${draft.worklog.title}`);
  print(`│ ${draft.worklog.summary}`);
  print('│');
  print(`│ ${formatMetricsRow(draft)}`);
  print('│');
  print(`│ Privacy: ${draft.privacy_scan.status}`);
  print('└─────────────────────────────────────────────┘\n');
  print(`Actions:\n  agentfeed publish --id ${draft.id} --yes\n  agentfeed scan --id ${draft.id}`);
}

async function cmdPublish(args: string[]) {
  const creds = await loadCredentials();
  if (!creds) throw new Error('AgentFeed token is missing. Run: agentfeed login, or pipe a token with: printf %s "$TOKEN" | agentfeed login --token-stdin');
  const id = await resolveDraftId(process.cwd(), args);
  const existingDraft = await readDraft(process.cwd(), id);
  const cacheReuseStatus = cachedUploadReuseStatusForCredentials(existingDraft, creds);
  if (!cacheReuseStatus.reusable && shouldRequireUploadConfirmation({ json: flag(args, '--json'), yes: flag(args, '--yes') || flag(args, '-y') })) {
    printUploadConfirmationRequired(existingDraft, `agentfeed publish --id ${id} --yes`, undefined, existingDraft.upload.uploaded ? { cacheReuseReason: cacheReuseStatus.reason } : {});
    return;
  }
  const metadata = await requireUploadPreflight(creds);
  const result = await publishDraft({ cwd: process.cwd(), id, credentials: creds, reviewBaseUrl: metadata?.review_base_url });
  const savedDraft = await readDraft(process.cwd(), id);
  if (flag(args, '--json')) {
    const handoff = await handoffReviewUrl(result.review_url, {
      copy: shouldCopyReviewUrl({ json: true, noClipboard: flag(args, '--no-clipboard'), clipboard: flag(args, '--clipboard') }),
      open: await shouldOpenReviewAfterUpload(flag(args, '--open-review'), { respectConfig: false, noOpen: flag(args, '--no-open-review') }),
      apiBaseUrl: creds.api_base_url,
      reviewBaseUrl: result.review_base_url ?? metadata?.review_base_url
    });
    print(JSON.stringify({ draft_id: id, upload: result, privacy_policy: privacyPolicySummary(savedDraft), handoff }, null, 2));
    return;
  }
  print(result.reused_existing ? 'Private review draft already uploaded; reusing existing review URL.\n' : 'Private review draft uploaded.\n');
  const privacyPolicyLines = formatPrivacyPolicyLines(savedDraft);
  for (const line of privacyPolicyLines) print(line);
  if (privacyPolicyLines.length) print();
  print(`Status: ${result.status}`);
  print(`Review URL:\n${result.review_url}`);
  printReviewUrlHandoff(await handoffReviewUrl(result.review_url, {
    copy: shouldCopyReviewUrl({ noClipboard: flag(args, '--no-clipboard') }),
    open: await shouldOpenReviewAfterUpload(flag(args, '--open-review'), { noOpen: flag(args, '--no-open-review') }),
    apiBaseUrl: creds.api_base_url,
    reviewBaseUrl: result.review_base_url ?? metadata?.review_base_url
  }), result.review_url);
}

async function cmdScan(args: string[]) {
  const dryRun = flag(args, '--dry-run') || flag(args, '--dry');
  if (option(args, '--path')) {
    const git = await collectGitMetrics(option(args, '--path')!);
    const areas = changedAreas(git.changed_files);
    const input = { changed_areas: areas };
    const result = scanAndRedactFields(input);
    print(flag(args, '--json')
      ? JSON.stringify(dryRun ? { dry_run: true, scan: result.scan, redacted_fields: redactedFieldPreviews(input, result.redacted) } : result.scan, null, 2)
      : formatPrivacyScanReport(input, result.redacted, result.scan, { dryRun }));
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
  print(flag(args, '--json')
    ? JSON.stringify(dryRun ? { dry_run: true, scan: result.scan, redacted_fields: redactedFieldPreviews(input, result.redacted) } : result.scan, null, 2)
    : formatPrivacyScanReport(input, result.redacted, result.scan, { dryRun }));
}

async function cmdHook(args: string[]) {
  const action = args[0];
  const target = args[1];
  if (target !== 'claude-code') throw new Error('Only claude-code hooks are supported in MVP.');
  const root = await resolveProjectRoot(process.cwd());
  const scope = flag(args, '--global') ? 'global' : 'project';
  const settingsPath = option(args, '--settings-path');
  if (action === 'install') {
    const result = await installClaudeCodeHook({ projectRoot: root, scope, settingsPath, dryRun: flag(args, '--dry-run') });
    print(`${flag(args, '--dry-run') ? 'Would install' : 'Installed'} AgentFeed Claude Code hook.`);
    print(`Settings: ${result.path}`);
  } else if (action === 'uninstall') {
    const result = await uninstallClaudeCodeHook({ projectRoot: root, scope, settingsPath });
    print('Uninstalled AgentFeed Claude Code hook.');
    print(`Settings: ${result.path}`);
  } else throw new Error('Usage: agentfeed hook install|uninstall claude-code');
}

async function cmdDoctor() {
  print(ui.heading('AgentFeed doctor'));
  print();
  const checks: Array<[string, boolean | string]> = [];
  checks.push(['Node version', process.versions.node]);
  checks.push(['agentfeed version', AGENTFEED_CLI_VERSION]);
  const diagnostics = await loadDiagnosticCredentialsWithMetadata({ cwd: process.cwd() });
  const credentialResolution = diagnostics.metadata;
  const creds = credentialResolution.credentials;
  const apiResolution = credentialResolution.api_base_url
    ? null
    : await resolveApiBaseUrlWithMetadata({ cwd: process.cwd() });
  const apiBaseUrl = credentialResolution.api_base_url ?? apiResolution?.value ?? await resolveApiBaseUrl();
  const apiReachability = diagnostics.invalidApiBaseUrl ? null : await checkApiReachability(apiBaseUrl);
  const apiCompatibility = diagnostics.invalidApiBaseUrl ? null : await checkApiCompatibility(apiBaseUrl);
  checks.push(['global credentials file exists', creds ? 'yes' : 'no']);
  checks.push(['credentials file path', credentialResolution.credentials_file_path]);
  checks.push(['credential source', credentialSourceLabel(credentialResolution.token_source)]);
  checks.push(['credential store', credentialStoreLabel(credentialResolution.credential_store)]);
  checks.push(['ingestion token exists', creds?.ingestion_token || credentialResolution.token_source === 'environment' ? 'yes' : 'no']);
  checks.push(['API base URL configured', apiBaseUrl]);
  checks.push([
    'API base URL source',
    apiBaseSourceLabel(
      credentialResolution.api_base_url_source ?? apiResolution?.source ?? 'default',
      credentialResolution.api_base_url_source_detail ?? apiResolution?.source_detail
    )
  ]);
  checks.push(['API ready', apiReachability
    ? apiReachability.ok ? `yes (${apiReachability.status})` : `no (${apiReachability.status ?? apiReachability.error ?? 'unreachable'})`
    : 'skipped (invalid API base URL)'
  ]);
  checks.push([
    'API compatibility',
    apiCompatibility
      ? apiCompatibility.compatible
      ? `yes (${apiCompatibility.data?.api_version ?? 'unknown'} / ${apiCompatibility.data?.contract_version ?? 'unknown'})`
      : `no (${apiCompatibility.status ?? apiCompatibility.error ?? 'unreachable'})`
      : 'skipped (invalid API base URL)'
  ]);
  const tokenWarnings: string[] = [];
  if (creds?.ingestion_token && !diagnostics.invalidApiBaseUrl) {
    const tokenCheck = await checkIngestionToken(creds);
    checks.push(['ingestion token valid', tokenCheck.ok ? `yes (${tokenCheck.status})` : `no (${tokenCheck.status ?? tokenCheck.error ?? 'unreachable'})`]);
    const expiresAt = tokenCheck.data?.token?.expires_at ?? creds.token_expires_at ?? null;
    checks.push(['ingestion token expires at', expiresAt ? formatTokenExpiry(expiresAt) : 'unknown']);
    const warning = tokenExpiryWarning(expiresAt, tokenCheck.data?.token?.expiring_soon);
    if (warning) tokenWarnings.push(warning);
  } else if (credentialResolution.token_source === 'environment' && diagnostics.invalidApiBaseUrl) {
    checks.push(['ingestion token valid', 'skipped (invalid API base URL)']);
    checks.push(['ingestion token expires at', 'unknown']);
  } else {
    checks.push(['ingestion token valid', 'skipped']);
    checks.push(['ingestion token expires at', 'unknown']);
  }
  let collectionStateLabel = 'unavailable (project not initialized)';
  let nextCollectionSinceLabel = 'unavailable (project not initialized)';
  try {
    await loadProjectConfig(process.cwd());
    checks.push(['project config valid', 'yes']);
    const collectionState = await readCollectionState(process.cwd());
    collectionStateLabel = formatCollectionCursor(collectionState.last_collected_at);
    nextCollectionSinceLabel = nextDefaultCollectionSince(collectionState.last_collected_at);
  } catch {
    checks.push(['project config valid', 'no']);
  }
  checks.push(['last collection cursor', collectionStateLabel]);
  checks.push(['next default collection since', nextCollectionSinceLabel]);
  const git = await collectGitMetrics(process.cwd());
  checks.push(['current directory is git repository', git.branch || git.head_commit ? 'yes' : 'no']);
  for (const [name, value] of checks) print(`${name}: ${value}`);
  for (const warning of [...credentialResolution.warnings, ...(apiResolution?.warnings ?? []), ...tokenWarnings]) print(`Warning: ${warning}`);
  print();
  for (const line of formatAgentSignalLines(await detectAgentSignals({ cwd: process.cwd() }))) print(line);
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

async function cmdDrafts(args: string[]) {
  const rows = await Promise.all((await listDrafts(process.cwd())).map((row) => draftListRow(row)));
  if (flag(args, '--json')) {
    print(JSON.stringify({ drafts: rows }, null, 2));
    return;
  }

  print(ui.heading(`AgentFeed drafts (${rows.length})`));
  if (!rows.length) {
    print();
    print('No local drafts found.');
    print();
    print(ui.section('Next'));
    print(`  ${ui.command('agentfeed collect --explain')}`);
    print(`  ${ui.command('agentfeed share --dry')}`);
    return;
  }

  print();
  for (const row of rows) {
    if (!row.valid) {
      print(`${row.id}  invalid`);
      print(`  Error: ${row.error}`);
      continue;
    }
    print(`${row.id}  ${row.status}  ${row.agent}  ${row.privacy} · findings ${row.findings}`);
    print(`  Project: ${row.project}`);
    print(`  Title: ${row.title}`);
    print(`  Metrics: ${row.metrics}`);
    if (row.status === 'uploaded') {
      print(`  Open: ${ui.command(`agentfeed open --id ${row.id}`)}`);
    } else {
      print(`  Upload: ${ui.command(`agentfeed publish --id ${row.id} --yes`)}`);
    }
  }

  const latest = rows.find((row) => row.valid);
  print();
  print(ui.section('Next'));
  if (latest) {
    print(`  ${ui.command(`agentfeed preview --id ${latest.id}`)}`);
    print(`  ${ui.command(latest.status === 'uploaded' ? `agentfeed open --id ${latest.id}` : `agentfeed publish --id ${latest.id} --yes`)}`);
  } else {
    print(`  ${ui.command('agentfeed collect --explain')}`);
  }
}

async function cmdDiscard(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const root = await resolveProjectRoot(process.cwd());
  const { jsonPath, markdownPath } = draftPaths(root, id);
  await rm(jsonPath, { force: true });
  await rm(markdownPath, { force: true });
  print(`Discarded draft: ${id}`);
}

async function cmdOpen(args: string[]) {
  const draft = flag(args, '--latest') || !option(args, '--id') ? await readLatestDraft(process.cwd()) : await readDraft(process.cwd(), option(args, '--id')!);
  if (!draft.upload.review_url) throw new Error('Draft has not been uploaded yet.');
  const credentials = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const trustedApiBases = new Set([DEFAULT_API_BASE_URL]);
  if (draft.upload.api_base_url) trustedApiBases.add(draft.upload.api_base_url);
  if (credentials.api_base_url) trustedApiBases.add(credentials.api_base_url);
  if (![...trustedApiBases].some((apiBaseUrl) => isTrustedReviewUrl(draft.upload.review_url!, apiBaseUrl, draft.upload.review_base_url))) {
    throw new Error('Saved draft review URL is invalid. Run agentfeed share again to upload a fresh private review draft.');
  }
  const opened = await openBrowser(draft.upload.review_url);
  print(opened ? 'Opened review URL.' : draft.upload.review_url);
}

function completionOptionsFor(command: string): string[] {
  const spec = COMMAND_ARG_SPECS[command];
  if (!spec) return ['--help'];
  return [...new Set([...(spec.flags ?? []), ...(spec.valueOptions ?? []), '--help'])].sort();
}

function zshCompletionScript(): string {
  const commandEntries = PUBLIC_COMMANDS
    .map((command) => `    '${command}:${COMMAND_DESCRIPTIONS[command]}'`)
    .join('\n');
  const optionCases = PUBLIC_COMMANDS
    .map((command) => `    ${command}) compadd -- ${completionOptionsFor(command).join(' ')} ;;`)
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
    .map((command) => `    ${command}) options="${completionOptionsFor(command).join(' ')}" ;;`)
    .join('\n');
  return `_agentfeed() {
  local cur command commands options
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  command="\${COMP_WORDS[1]}"
  commands="${commands}"

  if [[ COMP_CWORD -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
    return 0
  fi

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
  const lines = [
    'complete -c agentfeed -f',
    ...PUBLIC_COMMANDS.map((command) => `complete -c agentfeed -n "not __fish_seen_subcommand_from ${commandList}" -a "${command}" -d "${COMMAND_DESCRIPTIONS[command]}"`),
    ...PUBLIC_COMMANDS.flatMap((command) => completionOptionsFor(command).map((optionName) => {
      if (optionName.startsWith('--')) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -l ${optionName.slice(2)} -d "Option for agentfeed ${command}"`;
      }
      if (optionName.startsWith('-') && optionName.length === 2) {
        return `complete -c agentfeed -n "__fish_seen_subcommand_from ${command}" -s ${optionName.slice(1)} -d "Option for agentfeed ${command}"`;
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
    default: throw new Error(`Unsupported completion shell: ${shell}\nSupported shells: zsh, bash, fish`);
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

const PUBLIC_COMMANDS = [
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
  'hook',
  'drafts',
  'discard',
  'rotate',
  'logout',
  'completion'
] as const;

const COMMAND_DESCRIPTIONS: Record<(typeof PUBLIC_COMMANDS)[number], string> = {
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
  hook: 'Install or remove agent hooks',
  drafts: 'List local draft summaries',
  discard: 'Delete a local draft',
  rotate: 'Replace the saved ingestion token',
  logout: 'Remove saved credentials',
  completion: 'Print shell completion script'
};

const KNOWN_COMMANDS = new Set([
  'init',
  'login',
  'logout',
  'status',
  'rotate',
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
  validatePositionals?: (positionals: string[]) => string | null;
}

const NO_POSITIONALS = (command: string) => (positionals: string[]) =>
  positionals.length ? `Unexpected argument for ${command}: ${positionals[0]}` : null;

const COMMAND_ARG_SPECS: Record<string, CommandArgSpec> = {
  init: {
    flags: ['--no-git-check'],
    valueOptions: ['--project-name'],
    validatePositionals: NO_POSITIONALS('init')
  },
  login: {
    flags: ['--token-stdin', '--no-save', '--no-open', '--browser'],
    valueOptions: ['--token', '--api-base-url'],
    validatePositionals: NO_POSITIONALS('login')
  },
  logout: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('logout')
  },
  status: {
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
      if (positionals.length === 0) return 'Usage: agentfeed token rotate';
      if (positionals[0] !== 'rotate') return `Unknown token subcommand: ${positionals[0]}`;
      if (positionals.length > 1) return `Unexpected argument for token rotate: ${positionals[1]}`;
      return null;
    }
  },
  collect: {
    flags: ['--all', '--force', '--run-configured-commands', '--explain', '--json', '--upload', '--open-review', '--no-open-review', '--no-save-cursor', '--no-upload'],
    valueOptions: ['--source', '--session-file', '--since', '--until'],
    validatePositionals: NO_POSITIONALS('collect')
  },
  share: {
    flags: ['--dry', '--dry-run', '--yes', '-y', '--open-review', '--no-open-review', '--all', '--force', '--run-configured-commands', '--no-clipboard', '--no-clip', '--json', '--clipboard'],
    valueOptions: ['--source', '--session-file', '--since', '--until', '--note'],
    validatePositionals: NO_POSITIONALS('share')
  },
  preview: {
    flags: ['--latest', '--remote', '--json'],
    valueOptions: ['--id'],
    validatePositionals: NO_POSITIONALS('preview')
  },
  publish: {
    flags: ['--latest', '--yes', '-y', '--json', '--clipboard', '--no-clipboard', '--open-review', '--no-open-review'],
    valueOptions: ['--id'],
    validatePositionals: NO_POSITIONALS('publish')
  },
  scan: {
    flags: ['--latest', '--dry-run', '--dry', '--json'],
    valueOptions: ['--id', '--path'],
    validatePositionals: NO_POSITIONALS('scan')
  },
  hook: {
    flags: ['--global', '--project', '--dry-run'],
    valueOptions: ['--settings-path'],
    validatePositionals: (positionals) => {
      if (positionals.length < 2) return 'Usage: agentfeed hook install|uninstall claude-code';
      if (positionals.length > 2) return `Unexpected argument for hook: ${positionals[2]}`;
      const [action, target] = positionals;
      if (action !== 'install' && action !== 'uninstall') return 'Usage: agentfeed hook install|uninstall claude-code';
      if (target !== 'claude-code') return 'Only claude-code hooks are supported in MVP.';
      return null;
    }
  },
  doctor: {
    validatePositionals: NO_POSITIONALS('doctor')
  },
  drafts: {
    flags: ['--json'],
    validatePositionals: NO_POSITIONALS('drafts')
  },
  discard: {
    flags: ['--latest'],
    valueOptions: ['--id'],
    validatePositionals: NO_POSITIONALS('discard')
  },
  open: {
    flags: ['--latest'],
    valueOptions: ['--id'],
    validatePositionals: NO_POSITIONALS('open')
  },
  completion: {
    validatePositionals: (positionals) => {
      if (positionals.length === 0) return null;
      if (positionals.length > 1) return `Unexpected argument for completion: ${positionals[1]}`;
      return ['zsh', 'bash', 'fish'].includes(positionals[0])
        ? null
        : `Unsupported completion shell: ${positionals[0]}\nSupported shells: zsh, bash, fish`;
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

function closestMatch(input: string, candidates: readonly string[]): string | null {
  let best: { candidate: string; distance: number } | null = null;
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);
    if (!best || distance < best.distance) best = { candidate, distance };
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.floor(Math.max(input.length, best.candidate.length) / 3));
  return best.distance <= threshold ? best.candidate : null;
}

function commandHelpHint(command: string): string {
  return command === 'token'
    ? 'Run: agentfeed token rotate --help'
    : `Run: agentfeed ${command} --help`;
}

function unknownCommandError(command: string): Error {
  const suggestion = closestMatch(command, PUBLIC_COMMANDS);
  return new Error([
    `Unknown command: ${command}`,
    ...(suggestion ? [`Did you mean: agentfeed ${suggestion}`] : []),
    'Run: agentfeed --help'
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

  for (let i = 0; i < args.length; i += 1) {
    const raw = args[i];
    if (raw === '--') {
      throw new Error(`Unexpected argument for ${command}: --`);
    }
    if (raw.startsWith('--')) {
      const equalsIndex = raw.indexOf('=');
      const name = equalsIndex >= 0 ? raw.slice(0, equalsIndex) : raw;
      if (valueOptions.has(name)) {
        if (equalsIndex >= 0) {
          if (raw.slice(equalsIndex + 1).length === 0) throw new Error(`${name} requires a value.`);
        } else {
          const value = args[i + 1];
          if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
          i += 1;
        }
        continue;
      }
      if (flags.has(name)) {
        if (equalsIndex >= 0) throw new Error(`${name} does not accept a value.`);
        continue;
      }
      throw unknownOptionError(command, name, spec);
    }
    if (raw.startsWith('-')) {
      if (flags.has(raw)) continue;
      throw unknownOptionError(command, raw, spec);
    }
    positionals.push(raw);
  }

  const positionalError = spec.validatePositionals?.(positionals);
  if (positionalError) throw new Error(positionalError);
}

function printHelp(): void {
  print(ui.heading('Usage: agentfeed <command> [options]'));
  print(`Version: ${AGENTFEED_CLI_VERSION}`);
  print(`\n${ui.section('Quickstart')}:\n  agentfeed init\n  agentfeed login\n  printf %s "$TOKEN" | agentfeed login --token-stdin\n  printf %s "$TOKEN" | agentfeed login --token - --no-save\n  agentfeed share --yes --open-review`);
  print(`\n${ui.section('Daily workflow')}:\n  agentfeed share\n  agentfeed share --yes\n  agentfeed share --dry\n  agentfeed share --note "Fixed auth flow"\n  agentfeed status`);
  print(`\n${ui.section('Draft review')}:\n  agentfeed collect --explain\n  agentfeed preview --latest\n  agentfeed publish --latest --yes\n  agentfeed open --latest`);
  print(`\n${ui.section('Advanced and diagnostics')}:\n  agentfeed doctor\n  agentfeed scan --id <draft_id> --dry-run\n  agentfeed hook install claude-code\n  agentfeed drafts\n  agentfeed discard --id <draft_id>\n  agentfeed rotate\n  agentfeed logout`);
  print(`\n${ui.section('Shell completion')}:\n  agentfeed completion zsh\n  agentfeed completion bash\n  agentfeed completion fish`);
  print(`\n${ui.section('Commands')}:\n  ${PUBLIC_COMMANDS.join(', ')}`);
  print(`\nRun ${ui.command('agentfeed <command> --help')} for command-specific options.`);
}

function printCommandHelp(command: string): void {
  if (command === 'token') {
    print(`Usage: agentfeed token rotate [options]

Compatibility alias for:
  agentfeed rotate

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the authorization URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help`);
    return;
  }

  const helps: Record<string, string> = {
    init: `Usage: agentfeed init [options]

Initialize .agentfeed/config.json in the current git project.

Options:
  --project-name <name>     Override the detected project name
  --no-git-check            Allow initialization outside a git repository
  --help, -h                Show this help`,
    login: `Usage: agentfeed login [options]

Connect this machine to AgentFeed. Without token input, login starts the safe browser approval flow.

Options:
  --no-open                 Print the authorization URL instead of opening a browser
  --browser                 Allow browser login even in CI-like environments
  --no-save                 Do not persist credentials
  --api-base-url <url>      Override the AgentFeed API base URL
  --token-stdin             Read an ingestion token from stdin
  --token -                 Read an ingestion token from stdin
  --help, -h                Show this help`,
    logout: `Usage: agentfeed logout [options]

Remove saved AgentFeed credentials from this machine.

Options:
  --json                    Print machine-readable logout status
  --help, -h                Show this help`,
    status: `Usage: agentfeed status

Show credential, API, project, hook, draft, and collection cursor status.

Options:
  --help, -h                Show this help`,
    rotate: `Usage: agentfeed rotate [options]

Replace the saved ingestion token through browser approval.

Options:
  --browser                 Force browser-based token replacement
  --no-open                 Print the authorization URL instead of opening a browser
  --no-save                 Do not persist the replacement token
  --api-base-url <url>      Override the AgentFeed API base URL
  --help, -h                Show this help`,
    collect: `Usage: agentfeed collect [options]

Collect local agent work into a private review draft without uploading by default.

Common options:
  --source <source>         Agent source: claude-code, codex, cursor, gemini-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start collection window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --explain                 Include collection source/quality diagnostics
  --run-configured-commands Run configured local evidence commands

Advanced options:
  --json                    Print the draft JSON
  --upload                  Upload after collecting
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-save-cursor          Do not advance the collection cursor
  --no-upload               Suppress legacy auto_upload reminder
  --help, -h                Show this help`,
    share: `Usage: agentfeed share [options]

Collect, preview, and optionally upload a private review draft in one daily workflow.

Options:
  --yes, -y                 Upload without interactive confirmation
  --dry, --dry-run          Collect and preview only; do not upload
  --source <source>         Agent source: claude-code, codex, cursor, gemini-cli, other
  --session-file <path>     Read an explicit agent session file
  --since <timestamp>       Start collection window (ISO timestamp or last-collect)
  --until <timestamp>       End collection window (ISO timestamp)
  --all                     Ignore the saved collection cursor
  --force                   Recollect even if a matching draft already exists
  --note <text>             Attach a user note to the draft
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --no-clipboard, --no-clip Do not copy the review URL
  --json                    Print machine-readable output
  --clipboard               Copy review URL when --json is used
  --run-configured-commands Run configured local evidence commands
  --help, -h                Show this help`,
    preview: `Usage: agentfeed preview [options]

Render a saved local draft preview.

Options:
  --latest                  Preview the newest local draft (default)
  --id <draft_id>           Preview a specific draft
  --json                    Print the local draft JSON
  --remote                  Validate/render preview through the API
  --help, -h                Show this help`,
    publish: `Usage: agentfeed publish [options]

Upload a saved local draft as a private AgentFeed review draft.

Options:
  --latest                  Publish the newest local draft (default)
  --id <draft_id>           Publish a specific draft
  --yes, -y                 Upload without interactive confirmation
  --json                    Print machine-readable upload output
  --clipboard               Copy review URL when --json is used
  --no-clipboard            Do not copy the review URL
  --open-review             Open uploaded private review URL
  --no-open-review          Suppress browser handoff
  --help, -h                Show this help`,
    scan: `Usage: agentfeed scan [options]

Scan and redact public fields before sharing.

Options:
  --latest                  Scan the newest local draft (default)
  --id <draft_id>           Scan a specific draft
  --path <path>             Scan changed-area labels from a path's git state
  --dry-run, --dry          Report findings without modifying a draft
  --json                    Print machine-readable scan output
  --help, -h                Show this help`,
    hook: `Usage: agentfeed hook install|uninstall claude-code [options]

Install or remove the AgentFeed Claude Code hook.

Options:
  --global                  Modify the global Claude Code settings
  --project                 Use project settings (default)
  --settings-path <path>    Override the Claude Code settings path
  --dry-run                 Print intended install changes without writing
  --help, -h                Show this help`,
    doctor: `Usage: agentfeed doctor

Run local AgentFeed diagnostics for credentials, API reachability, project config, git, and agent signals.

Options:
  --help, -h                Show this help`,
    drafts: `Usage: agentfeed drafts [options]

List saved local draft summaries and next actions.

Options:
  --json                    Print machine-readable draft summaries
  --help, -h                Show this help`,
    discard: `Usage: agentfeed discard [options]

Delete a saved local draft.

Options:
  --latest                  Discard the newest local draft (default)
  --id <draft_id>           Discard a specific draft
  --help, -h                Show this help`,
    open: `Usage: agentfeed open [options]

Reopen a trusted review URL from a previously uploaded draft.

Options:
  --latest                  Open the newest uploaded draft (default)
  --id <draft_id>           Open a specific draft's review URL
  --help, -h                Show this help`,
    completion: `Usage: agentfeed completion <shell>

Print a shell completion script for AgentFeed commands and command-specific options.

Supported shells: zsh, bash, fish

Examples:
  agentfeed completion zsh > ~/.zsh/completions/_agentfeed
  agentfeed completion bash > ~/.local/share/bash-completion/completions/agentfeed
  agentfeed completion fish > ~/.config/fish/completions/agentfeed.fish

Options:
  --help, -h                Show this help`
  };

  const text = helps[command];
  if (!text) throw new Error(`Unknown command: ${command}`);
  print(text);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === undefined || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (hasHelpFlag(args)) {
    if (!KNOWN_COMMANDS.has(command)) throw unknownCommandError(command);
    printCommandHelp(command);
    return;
  }
  if (KNOWN_COMMANDS.has(command)) validateCommandArgs(command, args);
  switch (command) {
    case 'init': return cmdInit(args);
    case 'login': return cmdLogin(args);
    case 'logout': return cmdLogout(args);
    case 'status': return cmdStatus();
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
    case 'doctor': return cmdDoctor();
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
  err(ui.formatCliError(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
