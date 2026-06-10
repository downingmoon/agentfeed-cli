const MAX_ERROR_BODY_PREVIEW_CHARS = 160;

function normalizedContentType(value: string | null): string | null {
  if (!value) return null;
  const [mediaType] = value.split(';', 1);
  const normalized = mediaType?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

export function responseContentTypeIsJson(value: string | null): boolean {
  return (value ?? '').toLowerCase().includes('json');
}

function redactUrl(value: string): string {
  try {
    const url = new URL(value);
    url.username = '';
    url.password = '';
    if (url.search) url.search = '?[redacted]';
    if (url.hash) url.hash = '#[redacted]';
    return url.toString();
  } catch {
    return '[redacted-url]';
  }
}

function redactSensitiveText(value: string): string {
  return value
    .replace(/https?:\/\/[^\s<>"')]+/gi, redactUrl)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [redacted]')
    .replace(/\baf_(?:live|test|dev)_[A-Za-z0-9_-]+/g, 'af_[redacted]')
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+)\b/g, '[redacted-token]')
    .replace(/\b(token|secret|password|api[_-]?key|access[_-]?token|refresh[_-]?token)=([^&\s]+)/gi, '$1=[redacted]');
}

function bodyTextPreview(value: string): string | null {
  const withoutMarkup = value.replace(/<[^>]*>/g, ' ');
  const redacted = redactSensitiveText(withoutMarkup).replace(/\s+/g, ' ').trim();
  if (!redacted) return null;
  if (redacted.length <= MAX_ERROR_BODY_PREVIEW_CHARS) return redacted;
  return `${redacted.slice(0, MAX_ERROR_BODY_PREVIEW_CHARS - 1)}…`;
}

async function safeResponseText(response: Response): Promise<string | null> {
  try {
    return await response.text();
  } catch {
    return null;
  }
}

export function nonJsonErrorResponseDetails(response: Response): Record<string, unknown> {
  return {
    upstream_status: response.status,
    content_type: normalizedContentType(response.headers.get('content-type')) ?? 'unknown'
  };
}

export async function nonJsonErrorResponseMessage(response: Response, options: { readonly localDraftKept?: boolean } = {}): Promise<string> {
  const contentType = normalizedContentType(response.headers.get('content-type'));
  const body = await safeResponseText(response);
  const preview = body === null ? null : bodyTextPreview(body);
  const summary = `AgentFeed API returned a non-JSON error response (HTTP ${response.status}${contentType ? `, ${contentType}` : ''}).`;
  const diagnostic = preview ? `${summary} Body preview: "${preview}".` : summary;
  return options.localDraftKept ? `${diagnostic} Local draft was kept.` : diagnostic;
}
