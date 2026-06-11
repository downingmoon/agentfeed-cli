import { AgentFeedApiError } from './errors.js';
import { nonJsonErrorResponseDetails, nonJsonErrorResponseMessage, responseContentTypeIsJson } from './response-diagnostics.js';

export const DATA_RESPONSE_ENVELOPE_FIELDS = new Set(['data']);
const ERROR_RESPONSE_ENVELOPE_FIELDS = new Set(['error']);
const ERROR_DETAIL_FIELDS = new Set(['code', 'message', 'details']);

export interface ParsedApiErrorEnvelope {
  readonly code: string;
  readonly message: string;
  readonly details: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasOnlyExpectedFields(value: Record<string, unknown>, allowedFields: ReadonlySet<string>): boolean {
  return Object.keys(value).every((key) => allowedFields.has(key));
}

function apiErrorField(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function parseApiErrorEnvelope(value: unknown): ParsedApiErrorEnvelope | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, ERROR_RESPONSE_ENVELOPE_FIELDS) || !isRecord(value.error)) return null;
  if (!hasOnlyExpectedFields(value.error, ERROR_DETAIL_FIELDS)) return null;

  const code = apiErrorField(value.error.code);
  const message = apiErrorField(value.error.message);
  const details = value.error.details;
  if (!code || !message || !isRecord(details)) return null;
  return { code, message, details };
}

export function apiErrorResponseSummary(value: unknown): string | undefined {
  const parsed = parseApiErrorEnvelope(value);
  if (!parsed) return undefined;
  return `${parsed.code}: ${parsed.message}`;
}

export async function readResponseJson(
  response: Response,
  options: { readonly successMessage: string; readonly localDraftKept?: boolean },
): Promise<unknown> {
  if (!response.ok && !responseContentTypeIsJson(response.headers.get('content-type'))) {
    throw new AgentFeedApiError(
      502,
      'API_RESPONSE_INVALID',
      await nonJsonErrorResponseMessage(response, { localDraftKept: options.localDraftKept }),
      nonJsonErrorResponseDetails(response),
    );
  }
  try {
    return await response.json();
  } catch (error) {
    if (!response.ok) return {};
    if (error instanceof SyntaxError || error instanceof TypeError) {
      throw new AgentFeedApiError(
        502,
        'API_RESPONSE_INVALID',
        options.localDraftKept ? `${options.successMessage} Local draft was kept.` : options.successMessage,
      );
    }
    throw error;
  }
}

export function responseDataEnvelope(
  value: unknown,
  options: {
    readonly successMessage: string;
    readonly unexpectedFieldsMessage?: string;
    readonly localDraftKept?: boolean;
  },
): unknown {
  if (!isRecord(value) || !Object.hasOwn(value, 'data')) {
    throw new AgentFeedApiError(
      502,
      'API_RESPONSE_INVALID',
      options.localDraftKept ? `${options.successMessage} Local draft was kept.` : options.successMessage,
    );
  }
  if (!hasOnlyExpectedFields(value, DATA_RESPONSE_ENVELOPE_FIELDS)) {
    const message = options.unexpectedFieldsMessage ?? 'AgentFeed API response has unexpected data envelope fields.';
    throw new AgentFeedApiError(
      502,
      'API_RESPONSE_INVALID',
      options.localDraftKept ? `${message} Local draft was kept.` : message,
    );
  }
  return value.data;
}
