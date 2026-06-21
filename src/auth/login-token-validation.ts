import { checkIngestionToken, type ApiCheckResult } from '../api/client.js';
import type { AgentFeedCredentials } from '../types.js';

function apiCheckFailureDetail(result: ApiCheckResult): string {
  if (result.status != null) {
    return result.error ? `HTTP ${result.status}: ${result.error}` : `HTTP ${result.status}`;
  }
  return result.error ?? 'unknown token check failure';
}

export async function requireValidLoginTokenBeforeCredentialSave(credentials: AgentFeedCredentials): Promise<void> {
  const result = await checkIngestionToken(credentials);
  if (result.ok) return;
  throw new Error([
    `Ingestion token check failed for ${result.url}: ${apiCheckFailureDetail(result)} before saving credentials.`,
    'Run: agentfeed status',
    'Run: agentfeed login',
    'Run: agentfeed rotate'
  ].join('\n'));
}
