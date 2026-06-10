export interface ApiMetadata {
  service?: string;
  api_version?: string;
  backend_version?: string;
  contract_version?: string;
  review_base_url?: string;
  supported_clients?: {
    cli?: {
      min_version?: string;
      contract_version?: string;
    };
    frontend?: {
      min_version?: string;
      contract_version?: string;
    };
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

function optionalMetadataString(value: Record<string, unknown>, key: string): string | null | undefined {
  if (!Object.hasOwn(value, key)) return undefined;
  return typeof value[key] === 'string' ? value[key] : null;
}

function parseApiMetadataClient(value: unknown): NonNullable<NonNullable<ApiMetadata['supported_clients']>['cli']> | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_CLIENT_FIELDS)) return null;
  const minVersion = optionalMetadataString(value, 'min_version');
  const contractVersion = optionalMetadataString(value, 'contract_version');
  if (minVersion === null || contractVersion === null) return null;
  const client: NonNullable<NonNullable<ApiMetadata['supported_clients']>['cli']> = {};
  if (minVersion !== undefined) client.min_version = minVersion;
  if (contractVersion !== undefined) client.contract_version = contractVersion;
  return client;
}

function parseApiMetadataSupportedClients(value: unknown): NonNullable<ApiMetadata['supported_clients']> | null | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_SUPPORTED_CLIENTS_FIELDS)) return null;
  const cli = Object.hasOwn(value, 'cli') ? parseApiMetadataClient(value.cli) : undefined;
  const frontend = Object.hasOwn(value, 'frontend') ? parseApiMetadataClient(value.frontend) : undefined;
  if (cli === null || frontend === null) return null;
  const clients: NonNullable<ApiMetadata['supported_clients']> = {};
  if (cli !== undefined) clients.cli = cli;
  if (frontend !== undefined) clients.frontend = frontend;
  return clients;
}

export function parseApiMetadata(value: unknown): ApiMetadata | null {
  if (!isRecord(value) || !hasOnlyExpectedFields(value, API_METADATA_FIELDS)) return null;
  const service = optionalMetadataString(value, 'service');
  const apiVersion = optionalMetadataString(value, 'api_version');
  const backendVersion = optionalMetadataString(value, 'backend_version');
  const contractVersion = optionalMetadataString(value, 'contract_version');
  const reviewBaseUrl = optionalMetadataString(value, 'review_base_url');
  const supportedClients = parseApiMetadataSupportedClients(value.supported_clients);
  if (
    service === null
    || apiVersion === null
    || backendVersion === null
    || contractVersion === null
    || reviewBaseUrl === null
    || supportedClients === null
  ) return null;

  const metadata: ApiMetadata = {};
  if (service !== undefined) metadata.service = service;
  if (apiVersion !== undefined) metadata.api_version = apiVersion;
  if (backendVersion !== undefined) metadata.backend_version = backendVersion;
  if (contractVersion !== undefined) metadata.contract_version = contractVersion;
  if (reviewBaseUrl !== undefined) metadata.review_base_url = reviewBaseUrl;
  if (supportedClients !== undefined) metadata.supported_clients = supportedClients;
  return metadata;
}
