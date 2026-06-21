import { readCollectionStateWithDiagnostics } from '../config/collection-state.js';
import { resolveApiBaseUrl } from '../config/api-base.js';
import { collectGitMetrics } from '../collectors/git.js';
import { listDrafts } from '../draft/read.js';
import { hasAgentFeedHook, resolveClaudeSettingsPath } from '../hooks/claude-code-settings.js';
import { readJson, pathExists } from '../utils/fs.js';
import { flag } from './args.js';
import { loadDiagnosticCredentialsWithMetadata } from './diagnostic-credentials.js';
import { resolveStatusProject } from './status-project.js';
import { statusNextActions, statusReadinessItems } from './status-readiness.js';
import { renderStatusHumanLines, statusJsonPayload, type StatusHealth, type StatusOutputInput } from './status-output.js';

interface StatusCommandIo {
  readonly cwd: string;
  readonly print: (text?: string) => void;
  readonly printLines: (lines: readonly string[]) => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function draftUploadPendingForStatus(path: string): Promise<boolean> {
  try {
    const draft = await readJson<unknown>(path);
    if (!isRecord(draft)) return false;
    const upload = draft.upload;
    if (!isRecord(upload)) return true;
    return upload.uploaded !== true;
  } catch {
    return false;
  }
}

async function claudeCodeHookStatus(options: { readonly projectRoot: string; readonly hookScope: 'project' | 'global' }): Promise<{ readonly status: string; readonly warnings: readonly string[] }> {
  const settingsPath = resolveClaudeSettingsPath({ projectRoot: options.projectRoot, scope: options.hookScope });
  if (!settingsPath || !await pathExists(settingsPath)) return { status: 'unknown', warnings: [] };
  try {
    const status = hasAgentFeedHook(await readJson<Record<string, unknown>>(settingsPath)) ? 'installed' : 'not installed';
    return { status, warnings: [] };
  } catch {
    return {
      status: 'unknown',
      warnings: [`Claude Code settings could not be parsed at ${settingsPath}; hook status is unknown.`]
    };
  }
}

export async function runStatusCommand(args: string[] = [], io: StatusCommandIo): Promise<void> {
  const diagnostics = await loadDiagnosticCredentialsWithMetadata({ cwd: io.cwd });
  const credentialResolution = diagnostics.metadata;
  const creds = credentialResolution.credentials;
  const hasToken = Boolean(creds) || credentialResolution.token_source !== 'missing';
  const projectResolution = await resolveStatusProject(io.cwd);
  const config = projectResolution.config;
  const root = projectResolution.root;
  const projectConfigError = projectResolution.configError;
  const drafts = config ? await listDrafts(root) : [];
  const pending = (await Promise.all(drafts.map((draft) => draftUploadPendingForStatus(draft.path)))).filter(Boolean).length;
  const collectionStateResult = config ? await readCollectionStateWithDiagnostics(root) : null;
  const collectionState = collectionStateResult?.state ?? {};
  const hook = config
    ? await claudeCodeHookStatus({ projectRoot: root, hookScope: config.agents.claude_code.hook_scope })
    : { status: 'unknown', warnings: [] };
  const allWarnings = [
    ...credentialResolution.warnings,
    ...(projectConfigError ? [projectConfigError] : []),
    ...hook.warnings,
    ...(collectionStateResult?.warnings ?? [])
  ];
  const apiBaseUrl = credentialResolution.api_base_url ?? creds?.api_base_url ?? await resolveApiBaseUrl();
  const git = await collectGitMetrics(io.cwd);
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
    claudeCodeHook: hook.status,
    localDraftsCount: drafts.length,
    pendingUploadCount: pending,
    lastCollectionCursor: collectionState.last_collected_at ?? null,
    warnings: allWarnings,
    nextActions
  };

  if (flag(args, '--json')) {
    io.print(JSON.stringify(statusJsonPayload(statusOutput), null, 2));
    return;
  }

  io.printLines(renderStatusHumanLines(statusOutput));
}
