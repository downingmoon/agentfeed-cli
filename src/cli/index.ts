#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { initProject, loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { credentialsFromToken, loadCredentials, loadCredentialsWithMetadata, saveCredentials, type CredentialTokenSource } from '../config/credentials.js';
import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata, type ApiBaseUrlSource } from '../config/api-base.js';
import { DEFAULT_API_BASE_URL } from '../config/defaults.js';
import { markCollectionComplete, resolveCollectionWindow } from '../config/collection-state.js';
import { collectDraft, collectDraftWithStatus } from '../draft/create.js';
import { findLatestDraft, listDrafts, readDraft, readLatestDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { formatCollectionExplain } from '../draft/explain.js';
import { AgentFeedApiError, checkApiReachability, checkIngestionToken, isTrustedReviewUrl, previewDraftRemote, publishDraft, rotateIngestionToken } from '../api/client.js';
import { browserLogin } from '../auth/browser-login.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { applyRedactedPublicFields, publicScanFieldsFromDraft, scanAndRedactDraftPublicFields, type PublicScanFields } from '../privacy/draft-sanitizer.js';
import type { LocalDraft } from '../types.js';
import { collectGitMetrics } from '../collectors/git.js';
import { detectAgentSignals, formatAgentSignalLines } from '../collectors/agent-discovery.js';
import { changedAreas } from '../summary/changed-areas.js';
import { hasAgentFeedHook, installClaudeCodeHook, uninstallClaudeCodeHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { formatMetricsRow, formatSharePreview, parseShareArgs } from './share.js';
import { parseAgentSource } from './source.js';
import { readJson, pathExists } from '../utils/fs.js';
import { openBrowser } from '../utils/open-browser.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { draftPaths } from '../draft/paths.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function err(text = '') { process.stderr.write(`${text}\n`); }

function credentialSourceLabel(source: CredentialTokenSource): string {
  switch (source) {
    case 'environment': return 'environment (AGENTFEED_TOKEN)';
    case 'credentials_file': return 'saved credentials file';
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

function shouldCopyReviewUrl(options: { json?: boolean; noClipboard?: boolean; clipboard?: boolean }): boolean {
  if (options.noClipboard) return false;
  if (options.json) return options.clipboard === true;
  return true;
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

async function shouldOpenReviewAfterUpload(openFlag: boolean, options: { respectConfig?: boolean } = {}): Promise<boolean> {
  if (openFlag) return true;
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
  const token = option(args, '--token');
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  if (!token) {
    const existing = await loadCredentialsWithMetadata({ cwd: process.cwd() });
    const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open'), save: !noSave, cwd: process.cwd(), storedApiBaseUrl: existing.credentials?.api_base_url, allowCiBrowser: flag(args, '--browser') });
    print(noSave ? '\nAgentFeed browser login complete (not saved).\n' : '\nAgentFeed browser login complete.\n');
    print(`API: ${creds.api_base_url}`);
    if (creds.token_expires_at) print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
    print(noSave
      ? 'No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.'
      : 'Next:\n  agentfeed status');
    return;
  }
  const loginApiOptions = { apiBaseUrl, cwd: process.cwd(), trustRepoDiscoveredApiBase: process.env.AGENTFEED_TRUST_REPO_API_BASE === '1' };
  const creds = noSave ? await credentialsFromToken(token, loginApiOptions) : await saveCredentials(token, loginApiOptions);
  print(noSave ? 'AgentFeed token loaded for this command only (not saved).\n' : 'AgentFeed credentials saved.\n');
  print(`API: ${creds.api_base_url}`);
  if (creds.token_expires_at) print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
  print(noSave
    ? 'No credentials file was written. Future commands need AGENTFEED_TOKEN or a saved login.'
    : 'Next:\n  agentfeed status');
}

async function rotateViaBrowserLogin(args: string[], message: string) {
  const apiBaseUrl = option(args, '--api-base-url');
  const noSave = flag(args, '--no-save');
  const existing = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open'), save: !noSave, cwd: process.cwd(), storedApiBaseUrl: existing.credentials?.api_base_url, allowCiBrowser: flag(args, '--browser') });
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
    await rotateViaBrowserLogin(args, creds ? 'AgentFeed browser rotation complete.' : 'No saved token found. Starting browser login replacement.');
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
  try {
    const rotated = await rotateIngestionToken(creds);
    const saved = await saveCredentials(rotated.token, {
      apiBaseUrl: creds.api_base_url,
      user: rotated.user ?? creds.user,
      tokenExpiresAt: rotated.token_expires_at ?? rotated.expires_at
    });
    print('AgentFeed token rotated.\n');
    print(`Rotated from: ${rotated.rotated_from}`);
    print(`New token ID: ${rotated.id}`);
    print(`API: ${saved.api_base_url}`);
    if (saved.token_expires_at) print(`Token expires at: ${formatTokenExpiry(saved.token_expires_at)}`);
    print('Raw token was saved and not printed. Next:\n  agentfeed doctor');
  } catch (error) {
    if (error instanceof AgentFeedApiError && (error.status === 401 || error.code === 'INGESTION_TOKEN_INVALID')) {
      await rotateViaBrowserLogin(args, 'Saved token is invalid or expired. Browser login issued a replacement token.');
      return;
    }
    throw error;
  }
}

async function cmdStatus() {
  const credentialResolution = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const creds = credentialResolution.credentials;
  let config: Awaited<ReturnType<typeof loadProjectConfig>> | null = null;
  let root = process.cwd();
  try { root = await resolveProjectRoot(process.cwd()); config = await loadProjectConfig(root); } catch { /* not initialized */ }
  const drafts = config ? await listDrafts(root) : [];
  const pending = await Promise.all(drafts.map((d) => readDraft(root, d.id))).then((rows) => rows.filter((d) => !d.upload.uploaded).length).catch(() => 0);
  const settingsPath = config ? resolveClaudeSettingsPath({ projectRoot: root, scope: config.agents.claude_code.hook_scope }) : '';
  const hook = settingsPath && await pathExists(settingsPath) ? hasAgentFeedHook(await readJson<Record<string, unknown>>(settingsPath)) ? 'installed' : 'not installed' : 'unknown';
  print(`User/token: ${creds ? 'configured' : 'missing'}`);
  print(`User/token source: ${credentialSourceLabel(credentialResolution.token_source)}`);
  print(`Credentials file: ${credentialResolution.credentials_file_exists ? credentialResolution.credentials_file_path : 'missing'}`);
  print(`API base URL: ${credentialResolution.api_base_url ?? creds?.api_base_url ?? await resolveApiBaseUrl()}`);
  if (credentialResolution.api_base_url_source) {
    print(`API base URL source: ${apiBaseSourceLabel(credentialResolution.api_base_url_source, credentialResolution.api_base_url_source_detail)}`);
  }
  if (creds?.token_expires_at) {
    print(`Token expires at: ${formatTokenExpiry(creds.token_expires_at)}`);
    const warning = tokenExpiryWarning(creds.token_expires_at);
    if (warning) print(`Warning: ${warning}`);
  }
  for (const warning of credentialResolution.warnings) print(`Warning: ${warning}`);
  print(`Project initialized: ${config ? 'yes' : 'no'}`);
  if (config) print(`Project name: ${config.project.name}`);
  const git = await collectGitMetrics(process.cwd());
  print(`Git repository: ${git.branch || git.head_commit ? 'yes' : 'no'}`);
  print(`Claude Code hook: ${hook}`);
  print(`Local drafts count: ${drafts.length}`);
  print(`Pending upload count: ${pending}`);
}

async function cmdCollect(args: string[]) {
  const source = parseAgentSource(option(args, '--source'));
  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const collection = await collectDraftWithStatus({ cwd: process.cwd(), source, sessionFile: option(args, '--session-file') ?? null, since: window.since, until: window.until, force: flag(args, '--force') || flag(args, '--all'), runConfiguredCommands: flag(args, '--run-configured-commands') });
  const draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);
  if (flag(args, '--json')) {
    if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    print(JSON.stringify(draft, null, 2));
    return;
  }
  print(collection.reusedExisting ? 'Existing matching draft reused.\n' : 'Draft created.\n');
  print(`ID: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Privacy: ${draft.privacy_scan.status}`);
  print(`Metrics: ${formatMetricsRow(draft)}`);
  if (flag(args, '--explain')) print(`\n${formatCollectionExplain(draft)}`);
  print();
  print(`Preview:\n  agentfeed preview --id ${draft.id}\n`);
  print(`Upload:\n  agentfeed publish --id ${draft.id}`);
  if (flag(args, '--upload')) {
    await cmdPublish(['--id', draft.id, ...(flag(args, '--open-review') ? ['--open-review'] : [])]);
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
  const draft = await sanitizeDraftForCliOutput(process.cwd(), collection.draft);

  if (opts.json) {
    if (opts.dryRun) {
      print(JSON.stringify({ dry_run: true, reused_existing_draft: collection.reusedExisting, draft }, null, 2));
      return;
    }
    const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds! });
    draft.upload = { uploaded: true, worklog_id: result.id, review_url: result.review_url, uploaded_at: result.created_at };
    await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    print(JSON.stringify({ dry_run: false, reused_existing_draft: collection.reusedExisting, draft_id: draft.id, draft, upload: result }, null, 2));
    if (shouldCopyReviewUrl({ json: true, noClipboard: opts.noClipboard, clipboard: flag(args, '--clipboard') })) await copyToClipboard(result.review_url);
    if (await shouldOpenReviewAfterUpload(opts.openReview, { respectConfig: false })) await openBrowser(result.review_url);
    return;
  }

  if (collection.reusedExisting) print(`Reusing existing matching draft: ${draft.id}\n`);
  print(formatSharePreview(draft));
  print();

  if (opts.dryRun) {
    print(`Dry run complete. Local draft kept: ${draft.id}`);
    print(`Publish later:
  agentfeed publish --id ${draft.id}`);
    return;
  }

  const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds! });
  await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
  print(result.reused_existing ? 'Worklog already uploaded; reusing existing review URL.' : 'Worklog uploaded.');
  print(`Status: ${result.status}`);
  print(`Review URL:
${result.review_url}`);
  if (shouldCopyReviewUrl({ noClipboard: opts.noClipboard }) && await copyToClipboard(result.review_url)) print('Review URL copied to clipboard.');
  if (await shouldOpenReviewAfterUpload(opts.openReview)) {
    const opened = await openBrowser(result.review_url);
    if (!opened) print(result.review_url);
  }
}

async function cmdPreview(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const draft = await sanitizeDraftForCliOutput(process.cwd(), await readDraft(process.cwd(), id));
  if (flag(args, '--remote')) {
    const creds = await loadCredentials();
    if (!creds) throw new Error('AgentFeed token is missing. Run: agentfeed login --token <token>');
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
  print(`Actions:\n  agentfeed publish --id ${draft.id}\n  agentfeed scan --id ${draft.id}`);
}

async function cmdPublish(args: string[]) {
  const creds = await loadCredentials();
  if (!creds) throw new Error('AgentFeed token is missing. Run: agentfeed login --token <token>');
  const id = await resolveDraftId(process.cwd(), args);
  const result = await publishDraft({ cwd: process.cwd(), id, credentials: creds });
  if (flag(args, '--json')) {
    print(JSON.stringify({ draft_id: id, upload: result }, null, 2));
    if (shouldCopyReviewUrl({ json: true, noClipboard: flag(args, '--no-clipboard'), clipboard: flag(args, '--clipboard') })) await copyToClipboard(result.review_url);
    if (await shouldOpenReviewAfterUpload(flag(args, '--open-review'), { respectConfig: false })) await openBrowser(result.review_url);
    return;
  }
  print(result.reused_existing ? 'Worklog already uploaded; reusing existing review URL.\n' : 'Worklog uploaded.\n');
  print(`Status: ${result.status}`);
  print(`Review URL:\n${result.review_url}`);
  if (shouldCopyReviewUrl({ noClipboard: flag(args, '--no-clipboard') }) && await copyToClipboard(result.review_url)) print('Review URL copied to clipboard.');
  if (await shouldOpenReviewAfterUpload(flag(args, '--open-review'))) {
    const opened = await openBrowser(result.review_url);
    if (!opened) print(result.review_url);
  }
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
  const checks: Array<[string, boolean | string]> = [];
  checks.push(['Node version', process.versions.node]);
  checks.push(['agentfeed version', AGENTFEED_CLI_VERSION]);
  const credentialResolution = await loadCredentialsWithMetadata({ cwd: process.cwd() });
  const creds = credentialResolution.credentials;
  const apiResolution = credentialResolution.api_base_url
    ? null
    : await resolveApiBaseUrlWithMetadata({ cwd: process.cwd() });
  const apiBaseUrl = credentialResolution.api_base_url ?? apiResolution?.value ?? await resolveApiBaseUrl();
  const apiReachability = await checkApiReachability(apiBaseUrl);
  checks.push(['global credentials file exists', creds ? 'yes' : 'no']);
  checks.push(['credentials file path', credentialResolution.credentials_file_path]);
  checks.push(['credential source', credentialSourceLabel(credentialResolution.token_source)]);
  checks.push(['ingestion token exists', creds?.ingestion_token ? 'yes' : 'no']);
  checks.push(['API base URL configured', apiBaseUrl]);
  checks.push([
    'API base URL source',
    apiBaseSourceLabel(
      credentialResolution.api_base_url_source ?? apiResolution?.source ?? 'default',
      credentialResolution.api_base_url_source_detail ?? apiResolution?.source_detail
    )
  ]);
  checks.push(['API reachable', apiReachability.ok ? `yes (${apiReachability.status})` : `no (${apiReachability.status ?? apiReachability.error ?? 'unreachable'})`]);
  const tokenWarnings: string[] = [];
  if (creds?.ingestion_token) {
    const tokenCheck = await checkIngestionToken(creds);
    checks.push(['ingestion token valid', tokenCheck.ok ? `yes (${tokenCheck.status})` : `no (${tokenCheck.status ?? tokenCheck.error ?? 'unreachable'})`]);
    const expiresAt = tokenCheck.data?.token?.expires_at ?? creds.token_expires_at ?? null;
    checks.push(['ingestion token expires at', expiresAt ? formatTokenExpiry(expiresAt) : 'unknown']);
    const warning = tokenExpiryWarning(expiresAt, tokenCheck.data?.token?.expiring_soon);
    if (warning) tokenWarnings.push(warning);
  } else {
    checks.push(['ingestion token valid', 'skipped']);
    checks.push(['ingestion token expires at', 'unknown']);
  }
  try { await loadProjectConfig(process.cwd()); checks.push(['project config valid', 'yes']); } catch { checks.push(['project config valid', 'no']); }
  const git = await collectGitMetrics(process.cwd());
  checks.push(['current directory is git repository', git.branch || git.head_commit ? 'yes' : 'no']);
  for (const [name, value] of checks) print(`${name}: ${value}`);
  for (const warning of [...credentialResolution.warnings, ...(apiResolution?.warnings ?? []), ...tokenWarnings]) print(`Warning: ${warning}`);
  print();
  for (const line of formatAgentSignalLines(await detectAgentSignals({ cwd: process.cwd() }))) print(line);
}

async function cmdDrafts() {
  const drafts = await listDrafts(process.cwd());
  drafts.forEach((d) => print(d.id));
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
  if (credentials.api_base_url) trustedApiBases.add(credentials.api_base_url);
  if (![...trustedApiBases].some((apiBaseUrl) => isTrustedReviewUrl(draft.upload.review_url!, apiBaseUrl))) {
    throw new Error('Saved draft review URL is invalid. Run agentfeed share again to upload a fresh private review draft.');
  }
  const opened = await openBrowser(draft.upload.review_url);
  print(opened ? 'Opened review URL.' : draft.upload.review_url);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'init': return cmdInit(args);
    case 'login': return cmdLogin(args);
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
    case 'drafts': return cmdDrafts();
    case 'discard': return cmdDiscard(args);
    case 'open': return cmdOpen(args);
    case undefined:
    case '--help':
    case '-h':
      print('Usage: agentfeed <init|login|rotate|status|collect|share|preview|publish|scan|hook|doctor|drafts|discard|open>');
      print('\nLogin:\n  agentfeed login\n  agentfeed login --no-open\n  agentfeed login --no-save\n  agentfeed login --browser\n  agentfeed login --token <token>\n  agentfeed login --token <token> --no-save\n  agentfeed rotate\n  agentfeed rotate --browser\n  unset AGENTFEED_TOKEN && agentfeed rotate --browser\n  agentfeed token rotate');
      print('\nCollect:\n  agentfeed collect\n  agentfeed collect --explain\n  agentfeed collect --source codex\n  agentfeed collect --source gemini-cli\n  agentfeed collect --source claude-code --session-file <path>\n  agentfeed collect --since 2026-05-20T01:00:00Z\n  agentfeed collect --all\n  agentfeed collect --run-configured-commands');
      print('\nShare:\n  agentfeed share\n  agentfeed share --dry\n  agentfeed share --open-review\n  agentfeed share --since 2026-05-20T01:00:00Z\n  agentfeed share --all\n  agentfeed share --note "Fixed auth flow"\n  agentfeed share --no-clipboard\n  agentfeed share --json --clipboard\n  agentfeed share --run-configured-commands');
      print('\nPublish:\n  agentfeed publish --latest\n  agentfeed publish --id <draft_id>\n  agentfeed publish --json\n  agentfeed publish --json --clipboard\n  agentfeed publish --no-clipboard\n  agentfeed publish --open-review');
      print('\nScan:\n  agentfeed scan --id <draft_id>\n  agentfeed scan --id <draft_id> --dry-run\n  agentfeed scan --path . --json');
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  err(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
