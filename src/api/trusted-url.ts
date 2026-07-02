import { isIP } from 'node:net';

function isLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
  return host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '::1' ||
    host === '0.0.0.0' ||
    (isIP(host) === 4 && host.startsWith('127.'));
}

function allowInsecureRemoteApi(): boolean {
  return process.env.AGENTFEED_ALLOW_INSECURE_API === '1';
}

function isPublicIpv4Hostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[(.*)\]$/, '$1');
  if (isIP(host) !== 4) return false;

  const parts = host.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return false;
  const [first, second] = parts.map((part) => Number(part));
  if (first === undefined || second === undefined) return false;
  if (first === 0 || first === 10 || first === 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first >= 224) return false;
  return true;
}

function allowsInsecureReviewOrigin(url: URL): boolean {
  return url.protocol === 'http:' && allowInsecureRemoteApi() && isPublicIpv4Hostname(url.hostname);
}

function isAgentFeedHostname(hostname: string): boolean {
  return hostname === 'agentfeed.dev'
    || hostname.endsWith('.agentfeed.dev')
    || hostname === 'agentfeed.downingmoon.dev'
    || hostname === 'agentfeed.api.downingmoon.dev';
}

function isAgentFeedReviewHostname(hostname: string): boolean {
  return isAgentFeedHostname(hostname) && !hostname.startsWith('api.') && !hostname.includes('.api.');
}

function isExpectedReviewPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '');
  return /^\/worklogs\/[^/]+\/review$/.test(normalized);
}

export function trustedReviewOrigin(rawBaseUrl: string | null | undefined): string | null {
  if (!rawBaseUrl) return null;
  try {
    const url = new URL(rawBaseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    if (url.pathname.replace(/\/+$/, '') !== '') return null;
    if (!isLocalHostname(url.hostname) && url.protocol !== 'https:' && !allowsInsecureReviewOrigin(url)) return null;
    return url.origin;
  } catch (error) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

export function validateReviewUrl(reviewUrl: string, apiBaseUrl: string, reviewBaseUrl?: string | null): boolean {
  try {
    const review = new URL(reviewUrl);
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(review.protocol)) return false;
    if (review.username || review.password) return false;
    if (review.search || review.hash) return false;
    if (!isExpectedReviewPath(review.pathname)) return false;
    if (!isLocalHostname(review.hostname) && review.protocol !== 'https:' && !allowsInsecureReviewOrigin(review)) return false;
    const metadataReviewOrigin = trustedReviewOrigin(reviewBaseUrl);
    if (metadataReviewOrigin && review.origin === metadataReviewOrigin) return true;
    const configuredReviewOrigin = trustedReviewOrigin(process.env.AGENTFEED_REVIEW_BASE_URL);
    if (configuredReviewOrigin && review.origin === configuredReviewOrigin) return true;
    if (isLocalHostname(api.hostname)) return isLocalHostname(review.hostname);
    if (isAgentFeedHostname(api.hostname)) return isAgentFeedReviewHostname(review.hostname);
    return review.hostname === api.hostname;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}

function isExpectedAuthorizePath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === '/cli/authorize';
}

function hasOnlyExpectedAuthorizeQuery(url: URL, sessionId: string): boolean {
  const entries = Array.from(url.searchParams.entries());
  const allowed = new Set(['session_id', 'status_token']);
  if (![1, 2].includes(entries.length) || entries.some(([key]) => !allowed.has(key))) return false;
  if (entries.length === 1) return entries[0]?.[0] === 'session_id' && entries[0][1] === sessionId;
  const statusToken = url.searchParams.get('status_token')?.trim() ?? '';
  return url.searchParams.get('session_id') === sessionId && statusToken.length >= 16 && statusToken.length <= 256;
}

export function validateAuthorizeUrl(authorizeUrl: string, apiBaseUrl: string, sessionId: string): boolean {
  try {
    const authorize = new URL(authorizeUrl);
    const api = new URL(apiBaseUrl);
    if (!['http:', 'https:'].includes(authorize.protocol)) return false;
    if (authorize.username || authorize.password || authorize.hash) return false;
    if (!isExpectedAuthorizePath(authorize.pathname)) return false;
    if (!hasOnlyExpectedAuthorizeQuery(authorize, sessionId)) return false;
    if (isLocalHostname(api.hostname)) return isLocalHostname(authorize.hostname);
    if (authorize.protocol !== 'https:') return allowsInsecureReviewOrigin(authorize) && authorize.hostname === api.hostname;
    if (isAgentFeedHostname(api.hostname)) return isAgentFeedReviewHostname(authorize.hostname);
    return authorize.hostname === api.hostname;
  } catch (error) {
    if (error instanceof TypeError) return false;
    throw error;
  }
}
