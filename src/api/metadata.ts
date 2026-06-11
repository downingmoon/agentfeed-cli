export interface ApiMetadataClientCompatibility {
  readonly min_version: string;
  readonly contract_version: string;
}

export interface ApiMetadata {
  readonly service: string;
  readonly api_version: string;
  readonly backend_version: string;
  readonly contract_version: string;
  readonly review_base_url: string;
  readonly supported_clients: {
    readonly cli: ApiMetadataClientCompatibility;
    readonly frontend: ApiMetadataClientCompatibility;
  };
}

const API_METADATA_FIELDS = new Set(['service', 'api_version', 'backend_version', 'contract_version', 'review_base_url', 'supported_clients']);
const API_METADATA_SUPPORTED_CLIENTS_FIELDS = new Set(['cli', 'frontend']);
const API_METADATA_CLIENT_FIELDS = new Set(['min_version', 'contract_version']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyExpectedFields(value: Record<string, unknown>, allowedFields: ReadonlySet<string>): boolean {
  return Object.keys(value).every(key => allowedFields.has(key));
}

function requiredMetadataString(value: Record<string, unknown>, key: string): string | null {
  return typeof value[key] === 'string' ? value[key] : null;
}

function parseApiMetadataClient(value: unknown): ApiMetadataClientCompatibility | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_CLIENT_FIELDS)) return null;
  const minVersion = requiredMetadataString(value, 'min_version');
  const contractVersion = requiredMetadataString(value, 'contract_version');
  if (minVersion === null || contractVersion === null) return null;
  return {
    min_version: minVersion,
    contract_version: contractVersion,
  };
}

function parseApiMetadataSupportedClients(value: unknown): ApiMetadata['supported_clients'] | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_SUPPORTED_CLIENTS_FIELDS)) return null;
  const cli = parseApiMetadataClient(value.cli);
  const frontend = parseApiMetadataClient(value.frontend);
  if (cli === null || frontend === null) return null;
  return { cli, frontend };
}

export function parseApiMetadata(value: unknown): ApiMetadata | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_FIELDS)) return null;
  const service = requiredMetadataString(value, 'service');
  const apiVersion = requiredMetadataString(value, 'api_version');
  const backendVersion = requiredMetadataString(value, 'backend_version');
  const contractVersion = requiredMetadataString(value, 'contract_version');
  const reviewBaseUrl = requiredMetadataString(value, 'review_base_url');
  const supportedClients = parseApiMetadataSupportedClients(value.supported_clients);
  if (
    service === null
    || apiVersion === null
    || backendVersion === null
    || contractVersion === null
    || reviewBaseUrl === null
    || supportedClients === null
  ) return null;

  return {
    service,
    api_version: apiVersion,
    backend_version: backendVersion,
    contract_version: contractVersion,
    review_base_url: reviewBaseUrl,
    supported_clients: supportedClients,
  };
}
