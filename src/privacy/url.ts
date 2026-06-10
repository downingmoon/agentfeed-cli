import { isPrivateOrInternalHost } from './host-safety.js';

export function stripUrlUserInfo(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.username || url.password) {
      url.username = '';
      url.password = '';
    }
    return url.toString();
  } catch (error) {
    if (error instanceof TypeError) {
      // SCP-style and other non-URL Git remotes can expose private hosts or org/repo
      // names. Omit them from public-safe drafts unless they are explicit HTTP(S) URLs.
      return null;
    }
    throw error;
  }
}


export function repositoryUrlForUpload(value?: string | null): string | null {
  const sanitized = stripUrlUserInfo(value);
  if (!sanitized) return null;

  const url = new URL(sanitized);
  if (isPrivateOrInternalHost(url.hostname)) return null;
  return url.toString();
}
