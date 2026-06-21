import { resolveApiBaseUrl, resolveApiBaseUrlWithMetadata } from '../config/api-base.js';
import { readCollectionStateWithDiagnostics } from '../config/collection-state.js';
import { checkApiCompatibility, checkApiReachability, checkIngestionToken } from '../api/client.js';
import { collectGitMetrics } from '../collectors/git.js';
import { detectAgentSignals, formatAgentSignalLines, summarizeAgentSignals } from '../collectors/agent-discovery.js';
import { AGENTFEED_CLI_VERSION } from '../version.js';
import { flag } from './args.js';
import { loadDiagnosticCredentialsWithMetadata } from './diagnostic-credentials.js';
import { apiBaseSourceLabel, credentialSourceLabel, credentialStoreLabel, formatCollectionCursor, formatTokenExpiry, nextDefaultCollectionSince, tokenExpiryWarning } from './diagnostic-formatters.js';
import { doctorNextActions, doctorReadinessItems } from './doctor-readiness.js';
import { doctorJsonPayload, renderDoctorHumanLines, type DoctorCheckTuple } from './doctor-output.js';
import { resolveStatusProject } from './status-project.js';

interface DoctorCommandIo {
  readonly cwd: string;
  readonly nodeVersion: string;
  readonly print: (text?: string) => void;
  readonly printLines: (lines: readonly string[]) => void;
}

export async function runDoctorCommand(args: string[] = [], io: DoctorCommandIo): Promise<void> {
  const runtimeChecks: DoctorCheckTuple[] = [
    ['Node version', io.nodeVersion],
    ['agentfeed version', AGENTFEED_CLI_VERSION]
  ];
  const diagnostics = await loadDiagnosticCredentialsWithMetadata({ cwd: io.cwd });
  const credentialResolution = diagnostics.metadata;
  const creds = credentialResolution.credentials;
  const apiResolution = credentialResolution.api_base_url
    ? null
    : await resolveApiBaseUrlWithMetadata({ cwd: io.cwd });
  const apiBaseUrl = credentialResolution.api_base_url ?? apiResolution?.value ?? await resolveApiBaseUrl();
  const apiReachability = diagnostics.invalidApiBaseUrl ? null : await checkApiReachability(apiBaseUrl);
  const apiCompatibility = diagnostics.invalidApiBaseUrl ? null : await checkApiCompatibility(apiBaseUrl);
  const accountChecks: DoctorCheckTuple[] = [
    ['global credentials file exists', creds ? 'yes' : 'no'],
    ['credentials file path', credentialResolution.credentials_file_path],
    ['credential source', credentialSourceLabel(credentialResolution.token_source)],
    ['credential store', credentialStoreLabel(credentialResolution.credential_store)],
    ['ingestion token exists', creds?.ingestion_token || credentialResolution.token_source === 'environment' ? 'yes' : 'no']
  ];
  const apiChecks: DoctorCheckTuple[] = [
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
  const projectResolution = await resolveStatusProject(io.cwd);
  const projectConfigError = projectResolution.configError;
  const projectConfigValid = Boolean(projectResolution.config);
  if (projectConfigValid) {
    const collectionStateResult = await readCollectionStateWithDiagnostics(io.cwd);
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
  const git = await collectGitMetrics(io.cwd);
  const projectChecks: DoctorCheckTuple[] = [
    ['project config valid', projectConfigValid ? 'yes' : 'no'],
    ...(projectConfigError ? [['project config error', projectConfigError] satisfies [string, string]] : []),
    ['current directory is git repository', git.repository_root ? 'yes' : 'no']
  ];
  const collectionChecks: DoctorCheckTuple[] = [
    ['last collection cursor', collectionStateLabel],
    ['next default collection since', nextCollectionSinceLabel]
  ];
  const warnings = [
    ...credentialResolution.warnings,
    ...(apiResolution?.warnings ?? []),
    ...(projectConfigError ? [projectConfigError] : []),
    ...tokenWarnings
  ];
  const agentSignals = await detectAgentSignals({ cwd: io.cwd });
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
  const doctorOutput = {
    readiness,
    runtimeChecks,
    accountChecks,
    apiChecks,
    projectChecks,
    collectionChecks,
    warnings,
    agentSignalSummary,
    agentSignals: agentSignalLines,
    nextActions
  };

  if (flag(args, '--json')) {
    io.print(JSON.stringify(doctorJsonPayload(doctorOutput), null, 2));
    return;
  }

  io.printLines(renderDoctorHumanLines(doctorOutput));
}
