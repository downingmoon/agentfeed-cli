const PRIVATE_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.lan', '.home', '.corp', '.intranet'] as const;

type Ipv4Parts = {
  readonly first: number;
  readonly second: number;
  readonly third: number;
  readonly fourth: number;
};

function normalizeHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().replace(/\.+$/, '');
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

function parseIpv4(hostname: string): Ipv4Parts | null {
  const parts = hostname.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;

  const [first, second, third, fourth] = parts.map((part) => Number(part));
  if (
    !Number.isInteger(first) ||
    !Number.isInteger(second) ||
    !Number.isInteger(third) ||
    !Number.isInteger(fourth) ||
    first < 0 || first > 255 ||
    second < 0 || second > 255 ||
    third < 0 || third > 255 ||
    fourth < 0 || fourth > 255
  ) {
    return null;
  }

  return { first, second, third, fourth };
}

function isPrivateIpv4Parts(parts: Ipv4Parts): boolean {
  const { first, second, third } = parts;
  return first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224;
}

function isPrivateIpv4Host(hostname: string): boolean {
  const parts = parseIpv4(normalizeHostname(hostname));
  return parts !== null && isPrivateIpv4Parts(parts);
}

function normalizedIpv6Hostname(hostname: string): string | null {
  const normalized = normalizeHostname(hostname);
  return normalized.includes(':') ? normalized : null;
}

function ipv6Segment(value: string, index: number): number | null {
  const segments = value.split(':').filter(Boolean);
  const segment = segments[index];
  if (!segment || !/^[0-9a-f]{1,4}$/i.test(segment)) return null;
  return Number.parseInt(segment, 16);
}

function expandIpv6Segments(value: string): readonly number[] | null {
  const normalized = normalizeHostname(value);
  if (!normalized.includes(':') || normalized.split('::').length > 2) return null;

  const [head = '', tail = ''] = normalized.split('::');
  const headSegments = head ? head.split(':') : [];
  const tailSegments = tail ? tail.split(':') : [];
  const missing = 8 - headSegments.length - tailSegments.length;
  if (missing < 0 || (!normalized.includes('::') && missing !== 0)) return null;

  const rawSegments = [...headSegments, ...Array.from({ length: missing }, () => '0'), ...tailSegments];
  if (rawSegments.length !== 8 || rawSegments.some((segment) => !/^[0-9a-f]{1,4}$/i.test(segment))) return null;
  return rawSegments.map((segment) => Number.parseInt(segment, 16));
}

function embeddedIpv4FromSegments(high: number, low: number): Ipv4Parts {
  return {
    first: (high >> 8) & 0xff,
    second: high & 0xff,
    third: (low >> 8) & 0xff,
    fourth: low & 0xff
  };
}

function hasPrivateNat64EmbeddedIpv4(hostname: string): boolean {
  const segments = expandIpv6Segments(hostname);
  if (!segments) return false;

  const isWellKnownNat64 = segments[0] === 0x0064 &&
    segments[1] === 0xff9b &&
    segments.slice(2, 6).every((segment) => segment === 0);
  const isNetworkSpecificNat64 = segments[0] === 0x0064 && segments[1] === 0xff9b && segments[2] === 0x0001;
  if (!isWellKnownNat64 && !isNetworkSpecificNat64) return false;

  const high = segments[6];
  const low = segments[7];
  return high !== undefined && low !== undefined && isPrivateIpv4Parts(embeddedIpv4FromSegments(high, low));
}

function hasPrivate6to4EmbeddedIpv4(hostname: string): boolean {
  const segments = expandIpv6Segments(hostname);
  if (!segments || segments[0] !== 0x2002) return false;

  const high = segments[1];
  const low = segments[2];
  return high !== undefined && low !== undefined && isPrivateIpv4Parts(embeddedIpv4FromSegments(high, low));
}

function isTeredoHost(hostname: string): boolean {
  const segments = expandIpv6Segments(hostname);
  return Boolean(segments && segments[0] === 0x2001 && segments[1] === 0);
}

function isPrivateIpv6Host(hostname: string): boolean {
  const normalized = normalizedIpv6Hostname(hostname);
  if (!normalized) return false;
  if (normalized === '::' || normalized === '::1') return true;
  if (normalized.startsWith('::ffff:')) return true;

  const firstSegment = ipv6Segment(normalized, 0);
  const secondSegment = ipv6Segment(normalized, 1);
  if (firstSegment === null) return false;

  return (firstSegment & 0xfe00) === 0xfc00 ||
    (firstSegment & 0xffc0) === 0xfe80 ||
    (firstSegment & 0xff00) === 0xff00 ||
    (firstSegment === 0x2001 && secondSegment === 0x0db8) ||
    hasPrivateNat64EmbeddedIpv4(normalized) ||
    hasPrivate6to4EmbeddedIpv4(normalized) ||
    isTeredoHost(normalized);
}

export function isPrivateOrInternalHost(hostname: string): boolean {
  const normalized = normalizeHostname(hostname);
  return isPrivateIpv4Host(normalized) ||
    isPrivateIpv6Host(normalized) ||
    normalized === 'localhost' ||
    PRIVATE_HOST_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}
