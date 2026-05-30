export function stripUrlUserInfo(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) {
      url.username = '';
      url.password = '';
      return url.toString();
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
