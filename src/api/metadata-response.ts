import { parseApiMetadata, type ApiMetadata } from './metadata.js';
import { DATA_RESPONSE_ENVELOPE_FIELDS, hasOnlyExpectedFields } from './response-contract.js';

export interface ParsedApiMetadataResponse {
  readonly data?: ApiMetadata;
  readonly error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function parseMetadataResponse(response: Response): Promise<ParsedApiMetadataResponse> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { error: 'AgentFeed API metadata response is not JSON.' };
  }
  try {
    const parsed: unknown = await response.json();
    if (!isRecord(parsed) || !Object.hasOwn(parsed, 'data')) {
      return { error: 'AgentFeed API metadata response is missing the data envelope.' };
    }
    if (!hasOnlyExpectedFields(parsed, DATA_RESPONSE_ENVELOPE_FIELDS)) {
      return { error: 'AgentFeed API metadata response has unexpected data envelope fields.' };
    }
    const metadata = parseApiMetadata(parsed.data);
    return metadata ? { data: metadata } : { error: 'AgentFeed API metadata response data is invalid.' };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return { error: 'AgentFeed API metadata response contains invalid JSON.' };
    }
    throw error;
  }
}
