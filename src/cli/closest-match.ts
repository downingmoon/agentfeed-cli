function editDistance(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  const current = Array.from({ length: b.length + 1 }, () => 0);
  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
    }
    for (let j = 0; j < previous.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length] ?? 0;
}

function commonPrefixLength(a: string, b: string): number {
  const length = Math.min(a.length, b.length);
  let index = 0;
  while (index < length && a[index] === b[index]) index += 1;
  return index;
}

export function closestMatch(input: string, candidates: readonly string[]): string | null {
  let best: { readonly candidate: string; readonly distance: number; readonly prefix: number } | null = null;
  for (const candidate of candidates) {
    const distance = editDistance(input, candidate);
    const prefix = commonPrefixLength(input, candidate);
    if (
      !best
      || distance < best.distance
      || (distance === best.distance && prefix > best.prefix)
    ) {
      best = { candidate, distance, prefix };
    }
  }
  if (!best) return null;
  const threshold = Math.max(2, Math.floor(Math.max(input.length, best.candidate.length) / 3));
  return best.distance <= threshold ? best.candidate : null;
}
