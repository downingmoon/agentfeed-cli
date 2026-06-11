import type { AgentType, CollectionQuality, CollectionSource, CollectionWindowReason, PrivacyFinding, PrivacySeverity, PrivacyStatus, WorklogCategory, WorklogTimelineItem } from '../types.js';
import { draftError } from './validation-primitives.js';

export function requireAgentType(value: unknown, field: string, path: string): AgentType {
  switch (value) {
    case 'claude_code':
    case 'codex':
    case 'cursor':
    case 'gemini_cli':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireWorklogCategory(value: unknown, field: string, path: string): WorklogCategory {
  switch (value) {
    case 'web_app':
    case 'bot':
    case 'automation':
    case 'trading':
    case 'devops':
    case 'data':
    case 'ai_tool':
    case 'open_source':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivateVisibility(value: unknown, field: string, path: string): 'private' {
  if (value !== 'private') throw draftError(path, `${field} has an unsupported value`);
  return value;
}

export function requirePrivacyStatus(value: unknown, field: string, path: string): PrivacyStatus {
  switch (value) {
    case 'safe':
    case 'warning':
    case 'danger':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacySeverity(value: unknown, field: string, path: string): PrivacySeverity {
  switch (value) {
    case 'info':
    case 'low':
    case 'medium':
    case 'high':
    case 'critical':
    case 'unknown':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacyFindingType(value: unknown, field: string, path: string): PrivacyFinding['type'] {
  switch (value) {
    case 'possible_secret':
    case 'private_url':
    case 'email_address':
    case 'api_key_pattern':
    case 'env_file_reference':
    case 'sensitive_path':
    case 'database_url':
    case 'other':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requirePrivacyResolution(value: unknown, field: string, path: string): NonNullable<PrivacyFinding['resolution']> {
  switch (value) {
    case 'ignored':
    case 'redacted':
    case 'removed':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireTimelineStatus(value: unknown, field: string, path: string): NonNullable<WorklogTimelineItem['status']> {
  switch (value) {
    case 'success':
    case 'warning':
    case 'failed':
    case 'info':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionQuality(value: unknown, field: string, path: string): CollectionQuality {
  switch (value) {
    case 'high':
    case 'medium':
    case 'low':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionSourceType(value: unknown, field: string, path: string): CollectionSource['type'] {
  switch (value) {
    case 'agent_session':
    case 'plugin_metadata':
    case 'generic_metadata':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}

export function requireCollectionWindowReason(value: unknown, field: string, path: string): CollectionWindowReason {
  switch (value) {
    case 'idle_gap':
      return value;
    default:
      throw draftError(path, `${field} has an unsupported value`);
  }
}
