#!/usr/bin/env node
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { initProject, loadProjectConfig, resolveProjectRoot } from '../config/project-config.js';
import { loadCredentials, saveCredentials } from '../config/credentials.js';
import { resolveApiBaseUrl } from '../config/api-base.js';
import { markCollectionComplete, resolveCollectionWindow } from '../config/collection-state.js';
import { collectDraft } from '../draft/create.js';
import { findLatestDraft, listDrafts, readDraft, readLatestDraft } from '../draft/read.js';
import { writeDraft } from '../draft/write.js';
import { formatCollectionExplain } from '../draft/explain.js';
import { previewDraftRemote, publishDraft } from '../api/client.js';
import { browserLogin } from '../auth/browser-login.js';
import { scanAndRedactFields } from '../privacy/scan.js';
import { collectGitMetrics } from '../collectors/git.js';
import { changedAreas } from '../summary/changed-areas.js';
import { hasAgentFeedHook, installClaudeCodeHook, uninstallClaudeCodeHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { flag, option } from './args.js';
import { formatMetricsRow, formatSharePreview, parseShareArgs } from './share.js';
import type { AgentType } from '../types.js';
import { readJson, pathExists } from '../utils/fs.js';
import { openBrowser } from '../utils/open-browser.js';

function print(text = '') { process.stdout.write(`${text}\n`); }
function err(text = '') { process.stderr.write(`${text}\n`); }

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
  if (!token) {
    const creds = await browserLogin({ apiBaseUrl, noOpen: flag(args, '--no-open') });
    print('\nAgentFeed browser login complete.\n');
    print(`API: ${creds.api_base_url}`);
    print('Next:\n  agentfeed status');
    return;
  }
  const creds = await saveCredentials(token, { apiBaseUrl });
  print('AgentFeed credentials saved.\n');
  print(`API: ${creds.api_base_url}`);
  print('Next:\n  agentfeed status');
}

async function cmdStatus() {
  const creds = await loadCredentials();
  let config: Awaited<ReturnType<typeof loadProjectConfig>> | null = null;
  let root = process.cwd();
  try { root = await resolveProjectRoot(process.cwd()); config = await loadProjectConfig(root); } catch { /* not initialized */ }
  const drafts = config ? await listDrafts(root) : [];
  const pending = await Promise.all(drafts.map((d) => readDraft(root, d.id))).then((rows) => rows.filter((d) => !d.upload.uploaded).length).catch(() => 0);
  const settingsPath = config ? resolveClaudeSettingsPath({ projectRoot: root, scope: config.agents.claude_code.hook_scope }) : '';
  const hook = settingsPath && await pathExists(settingsPath) ? hasAgentFeedHook(await readJson<Record<string, unknown>>(settingsPath)) ? 'installed' : 'not installed' : 'unknown';
  print(`User/token: ${creds ? 'configured' : 'missing'}`);
  print(`API base URL: ${creds?.api_base_url ?? await resolveApiBaseUrl()}`);
  print(`Project initialized: ${config ? 'yes' : 'no'}`);
  if (config) print(`Project name: ${config.project.name}`);
  const git = await collectGitMetrics(process.cwd());
  print(`Git repository: ${git.branch || git.head_commit ? 'yes' : 'no'}`);
  print(`Claude Code hook: ${hook}`);
  print(`Local drafts count: ${drafts.length}`);
  print(`Pending upload count: ${pending}`);
}

async function cmdCollect(args: string[]) {
  const sourceOption = option(args, '--source');
  const source = sourceOption ? sourceOption.replace(/-/g, '_') as AgentType : undefined;
  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const draft = await collectDraft({ cwd: process.cwd(), source, sessionFile: option(args, '--session-file') ?? null, since: window.since, until: window.until });
  if (flag(args, '--json')) { print(JSON.stringify(draft, null, 2)); return; }
  print('Draft created.\n');
  print(`ID: ${draft.id}`);
  print(`Project: ${draft.project.name}`);
  print(`Privacy: ${draft.privacy_scan.status}`);
  print(`Metrics: ${formatMetricsRow(draft)}`);
  if (flag(args, '--explain')) print(`\n${formatCollectionExplain(draft)}`);
  print();
  print(`Preview:\n  agentfeed preview --id ${draft.id}\n`);
  print(`Upload:\n  agentfeed publish --id ${draft.id}`);
  const config = await loadProjectConfig(process.cwd());
  if (flag(args, '--upload') || (!flag(args, '--no-upload') && config.collection.auto_upload)) {
    await cmdPublish(['--id', draft.id, ...(flag(args, '--open-review') ? ['--open-review'] : [])]);
  }
  if (!flag(args, '--no-save-cursor')) await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
}

async function cmdShare(args: string[]) {
  const opts = parseShareArgs(args);
  const creds = opts.dryRun ? null : await loadCredentials();
  if (!opts.dryRun && !creds) throw new Error('AgentFeed token is missing. Run: agentfeed login');

  const window = await resolveCollectionWindow({ cwd: process.cwd(), args });
  const draft = await collectDraft({ cwd: process.cwd(), source: opts.source, sessionFile: opts.sessionFile, since: window.since, until: window.until });

  if (opts.json) {
    if (opts.dryRun) {
      print(JSON.stringify({ dry_run: true, draft }, null, 2));
      return;
    }
    const result = await publishDraft({ cwd: process.cwd(), id: draft.id, credentials: creds! });
    await markCollectionComplete(process.cwd(), draft.source.collection_window, new Date(draft.source.created_at));
    print(JSON.stringify({ dry_run: false, draft_id: draft.id, upload: result }, null, 2));
    if (opts.openReview) await openBrowser(result.review_url);
    return;
  }

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
  print('Worklog uploaded.');
  print(`Status: ${result.status}`);
  print(`Review URL:
${result.review_url}`);
  if (opts.openReview) {
    const opened = await openBrowser(result.review_url);
    if (!opened) print(result.review_url);
  }
}

async function cmdPreview(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const draft = await readDraft(process.cwd(), id);
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
  print('Worklog uploaded.\n');
  print(`Status: ${result.status}`);
  print(`Review URL:\n${result.review_url}`);
  if (flag(args, '--open-review')) {
    const opened = await openBrowser(result.review_url);
    if (!opened) print(result.review_url);
  }
}

async function cmdScan(args: string[]) {
  if (option(args, '--path')) {
    const git = await collectGitMetrics(option(args, '--path')!);
    const areas = changedAreas(git.changed_files);
    const result = scanAndRedactFields({ changed_areas: areas });
    print(flag(args, '--json') ? JSON.stringify(result.scan, null, 2) : `Privacy: ${result.scan.status}\nFindings: ${result.scan.findings.length}`);
    return;
  }
  const id = await resolveDraftId(process.cwd(), args);
  const draft = await readDraft(process.cwd(), id);
  const result = scanAndRedactFields({
    title: draft.worklog.title,
    summary: draft.worklog.summary,
    public_prompt: draft.worklog.public_prompt,
    outcome: draft.worklog.outcome,
    timeline: draft.worklog.timeline,
    changed_areas: draft.worklog.changed_areas,
    tags: draft.worklog.tags,
    project: draft.project
  });
  draft.privacy_scan = result.scan;
  await writeDraft(process.cwd(), draft);
  print(flag(args, '--json') ? JSON.stringify(result.scan, null, 2) : `Privacy: ${result.scan.status}\nFindings: ${result.scan.findings.length}`);
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
  checks.push(['agentfeed version', '0.2.0']);
  const creds = await loadCredentials();
  checks.push(['global credentials file exists', creds ? 'yes' : 'no']);
  checks.push(['ingestion token exists', creds?.ingestion_token ? 'yes' : 'no']);
  checks.push(['API base URL configured', creds?.api_base_url ?? process.env.AGENTFEED_API_BASE_URL ?? 'no']);
  try { await loadProjectConfig(process.cwd()); checks.push(['project config valid', 'yes']); } catch { checks.push(['project config valid', 'no']); }
  const git = await collectGitMetrics(process.cwd());
  checks.push(['current directory is git repository', git.branch || git.head_commit ? 'yes' : 'no']);
  for (const [name, value] of checks) print(`${name}: ${value}`);
}

async function cmdDrafts() {
  const drafts = await listDrafts(process.cwd());
  drafts.forEach((d) => print(d.id));
}

async function cmdDiscard(args: string[]) {
  const id = await resolveDraftId(process.cwd(), args);
  const root = await resolveProjectRoot(process.cwd());
  await rm(join(root, '.agentfeed', 'drafts', `${id}.json`), { force: true });
  await rm(join(root, '.agentfeed', 'drafts', `${id}.md`), { force: true });
  print(`Discarded draft: ${id}`);
}

async function cmdOpen(args: string[]) {
  const draft = flag(args, '--latest') || !option(args, '--id') ? await readLatestDraft(process.cwd()) : await readDraft(process.cwd(), option(args, '--id')!);
  if (!draft.upload.review_url) throw new Error('Draft has not been uploaded yet.');
  const opened = await openBrowser(draft.upload.review_url);
  print(opened ? 'Opened review URL.' : draft.upload.review_url);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case 'init': return cmdInit(args);
    case 'login': return cmdLogin(args);
    case 'status': return cmdStatus();
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
      print('Usage: agentfeed <init|login|status|collect|share|preview|publish|scan|hook|doctor|drafts|discard|open>');
      print('\nLogin:\n  agentfeed login\n  agentfeed login --no-open\n  agentfeed login --token <token>');
      print('\nCollect:\n  agentfeed collect\n  agentfeed collect --explain\n  agentfeed collect --source codex\n  agentfeed collect --source gemini-cli\n  agentfeed collect --source claude-code --session-file <path>\n  agentfeed collect --since 2026-05-20T01:00:00Z\n  agentfeed collect --all');
      print('\nShare:\n  agentfeed share\n  agentfeed share --dry\n  agentfeed share --open-review\n  agentfeed share --since 2026-05-20T01:00:00Z\n  agentfeed share --all');
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  err(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
