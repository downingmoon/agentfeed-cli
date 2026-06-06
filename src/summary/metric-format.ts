function formatScaledCount(value: number, unit: number, decimals: number): string {
  return (value / unit).toFixed(decimals).replace(/\.0+$|(\.\d*[1-9])0+$/, '$1');
}

export function formatTokenCount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${formatScaledCount(value, 1_000_000_000, 2)}B tokens`;
  if (abs >= 1_000_000) return `${formatScaledCount(value, 1_000_000, 1)}M tokens`;
  if (abs >= 1_000) return `${Math.round(value / 1000)}K tokens`;
  return `${value} tokens`;
}
