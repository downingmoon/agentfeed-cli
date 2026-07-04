import type { ApiBaseUrlSource } from '../config/api-base.js';
import type { CredentialsResolution, CredentialTokenSource } from '../config/credentials.js';
import { formatCollectionCursor, nextDefaultCollectionSince, credentialSourceLabel, credentialStoreLabel, apiBaseSourceLabel, formatTokenExpiry, formatWarningLines, readinessMarker, tokenExpiryWarning } from './diagnostic-formatters.js';
import { renderRecommendedCommandLines } from './guided-next-command-renderer.js';
import { setupProgressText, statusSummary, type StatusReadinessItem, type StatusReadinessSummary } from './status-readiness.js';
import * as ui from './ui.js';

export type StatusHealth = 'ready' | 'attention needed' | 'setup needed';

export type StatusOutputInput = {
  readonly health: StatusHealth;
  readonly readiness: readonly StatusReadinessItem[];
  readonly hasToken: boolean;
  readonly tokenSource: CredentialTokenSource;
  readonly credentialStore: CredentialsResolution['credential_store'];
  readonly credentialsFileExists: boolean;
  readonly credentialsFilePath: string;
  readonly tokenExpiresAt: string | null;
  readonly apiBaseUrl: string;
  readonly apiBaseUrlSource?: ApiBaseUrlSource | undefined;
  readonly apiBaseUrlSourceDetail?: string | undefined;
  readonly invalidApiBaseUrl: boolean;
  readonly projectInitialized: boolean;
  readonly projectName: string | null;
  readonly projectRoot: string | null;
  readonly projectConfigError: string | null;
  readonly insideGitRepository: boolean;
  readonly localDraftsCount: number;
  readonly pendingUploadCount: number;
  readonly lastCollectionCursor: string | null;
  readonly warnings: readonly string[];
  readonly nextActions: readonly string[];
};

export type StatusJsonPayload = {
  readonly health: StatusHealth;
  readonly summary: StatusReadinessSummary;
  readonly readiness: readonly StatusReadinessItem[];
  readonly account: {
    readonly token_configured: boolean;
    readonly token_source: CredentialTokenSource;
    readonly token_source_label: string;
    readonly credential_store: CredentialsResolution['credential_store'];
    readonly credential_store_label: string;
    readonly credentials_file: {
      readonly exists: boolean;
      readonly path: string;
    };
    readonly token_expires_at: string | null;
  };
  readonly api: {
    readonly base_url: string;
    readonly source: ApiBaseUrlSource | null;
    readonly source_label: string | null;
    readonly source_detail: string | null;
    readonly invalid: boolean;
  };
  readonly project: {
    readonly initialized: boolean;
    readonly name: string | null;
    readonly root: string | null;
    readonly config_error: string | null;
    readonly git_repository: boolean;
  };
  readonly collection: {
    readonly local_drafts_count: number;
    readonly pending_upload_count: number;
    readonly last_collection_cursor: string | null;
    readonly last_collection_cursor_label: string;
    readonly next_default_collection_since: string | null;
    readonly next_default_collection_since_label: string;
  };
  readonly warnings: readonly string[];
  readonly next_actions: readonly string[];
};

function renderStatusReadinessLines(items: readonly StatusReadinessItem[]): string[] {
  const lines = [ui.section('Readiness')];
  for (const item of items) {
    const next = item.next_action ? ` → ${item.next_action}` : '';
    lines.push(`${readinessMarker(item.status)} ${item.name}: ${item.detail}${next}`);
  }
  return lines;
}

function statusProjectInitializedLabel(input: StatusOutputInput): string {
  if (input.projectInitialized) return 'yes';
  return input.projectConfigError ? 'error' : 'no';
}

function statusWarningLines(warnings: readonly string[]): string[] {
  const lines: string[] = [];
  for (const warning of warnings) {
    lines.push(...formatWarningLines(warning));
  }
  return lines;
}

export function statusJsonPayload(input: StatusOutputInput): StatusJsonPayload {
  return {
    health: input.health,
    summary: statusSummary(input.readiness),
    readiness: input.readiness,
    account: {
      token_configured: input.hasToken,
      token_source: input.tokenSource,
      token_source_label: credentialSourceLabel(input.tokenSource),
      credential_store: input.credentialStore,
      credential_store_label: credentialStoreLabel(input.credentialStore),
      credentials_file: {
        exists: input.credentialsFileExists,
        path: input.credentialsFilePath
      },
      token_expires_at: input.tokenExpiresAt
    },
    api: {
      base_url: input.apiBaseUrl,
      source: input.apiBaseUrlSource ?? null,
      source_label: input.apiBaseUrlSource ? apiBaseSourceLabel(input.apiBaseUrlSource, input.apiBaseUrlSourceDetail) : null,
      source_detail: input.apiBaseUrlSourceDetail ?? null,
      invalid: input.invalidApiBaseUrl
    },
    project: {
      initialized: input.projectInitialized,
      name: input.projectName,
      root: input.projectRoot,
      config_error: input.projectConfigError,
      git_repository: input.insideGitRepository
    },
    collection: {
      local_drafts_count: input.localDraftsCount,
      pending_upload_count: input.pendingUploadCount,
      last_collection_cursor: input.lastCollectionCursor,
      last_collection_cursor_label: formatCollectionCursor(input.lastCollectionCursor),
      next_default_collection_since: input.lastCollectionCursor,
      next_default_collection_since_label: nextDefaultCollectionSince(input.lastCollectionCursor)
    },
    warnings: input.warnings,
    next_actions: input.nextActions
  };
}

export function renderStatusHumanLines(input: StatusOutputInput): string[] {
  const lines = [
    ui.heading('AgentFeed status'),
    `Health: ${input.health === 'ready' ? ui.good(input.health) : ui.warn(input.health)}`,
    '',
    ...renderStatusReadinessLines(input.readiness),
    `Setup progress: ${setupProgressText(input.readiness)}`,
    '',
    ui.section('Account'),
    `User/token: ${input.hasToken ? 'configured' : 'missing'}`,
    `User/token source: ${credentialSourceLabel(input.tokenSource)}`,
    `Credential store: ${credentialStoreLabel(input.credentialStore)}`,
    `Credentials file: ${input.credentialsFileExists ? input.credentialsFilePath : 'missing'}`
  ];
  if (input.tokenExpiresAt) {
    lines.push(`Token expires at: ${formatTokenExpiry(input.tokenExpiresAt)}`);
    const warning = tokenExpiryWarning(input.tokenExpiresAt);
    if (warning) lines.push(...statusWarningLines([warning]));
  }
  lines.push('', ui.section('API'), `API base URL: ${input.apiBaseUrl}`);
  if (input.apiBaseUrlSource) {
    lines.push(`API base URL source: ${apiBaseSourceLabel(input.apiBaseUrlSource, input.apiBaseUrlSourceDetail)}`);
  }
  lines.push(...statusWarningLines(input.warnings));
  lines.push(
    '',
    ui.section('Project'),
    `Project initialized: ${statusProjectInitializedLabel(input)}`
  );
  if (input.projectName) lines.push(`Project name: ${input.projectName}`);
  if (input.projectConfigError) lines.push(`Project config error: ${input.projectConfigError}`);
  lines.push(
    `Git repository: ${input.insideGitRepository ? 'yes' : 'no'}`,
    '',
    ui.section('Collection'),
    `Local drafts count: ${input.localDraftsCount}`,
    `Pending upload count: ${input.pendingUploadCount}`,
    `Last collection cursor: ${formatCollectionCursor(input.lastCollectionCursor)}`,
    `Next default collection since: ${nextDefaultCollectionSince(input.lastCollectionCursor)}`
  );
  if (input.pendingUploadCount > 0 && input.lastCollectionCursor) {
    lines.push(...statusWarningLines(['pending local drafts exist while a collection cursor is set; publish/discard them or use --all/--since if the next collect looks empty.']));
  }
  lines.push('', ui.section('Next'), ...renderRecommendedCommandLines({ commands: input.nextActions, command: ui.command }));
  return lines;
}
