import type { ChangedFileSummary, GitMetrics } from '../types.js';

const GENERIC_PATH_TOKENS = new Set([
  'index', 'main', 'app', 'page', 'route', 'routes', 'component', 'components',
  'ui', 'api', 'client', 'server', 'test', 'tests', 'spec', 'schema', 'types',
  'src', 'lib', 'source', 'utils', 'helpers', 'layout', 'style', 'styles', 'config', 'settings', 'readme',
]);
const PRIVATE_PATH_TOKENS = /(^|\s)(private|secret|credential|password|token|api\s*key|sk\s*live)(\s|$)/i;

function pathSegments(path: string): readonly string[] {
  return path.split(/[\\/]+/).map((segment) => segment.trim()).filter(Boolean);
}

function stripExtension(segment: string): string {
  const extensionStart = segment.lastIndexOf('.');
  return extensionStart > 0 ? segment.slice(0, extensionStart) : segment;
}

function humanizeToken(value: string): string | null {
  if (value.endsWith('.test') || value.endsWith('.spec')) return null;
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length < 3 || normalized.length > 42) return null;
  if (!/[a-z]/i.test(normalized)) return null;
  if (/^[0-9a-f]{8,}$/i.test(normalized.replace(/\s/g, ''))) return null;
  if (PRIVATE_PATH_TOKENS.test(normalized)) return null;
  if (GENERIC_PATH_TOKENS.has(normalized.toLowerCase())) return null;
  return normalized.split(' ').map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`).join(' ');
}

export function publicFeatureLabelForPath(path: string): string | null {
  const segments = pathSegments(path);
  const basenameLabel = humanizeToken(stripExtension(segments.at(-1) ?? ''));
  if (basenameLabel) return basenameLabel;
  for (const segment of segments.slice(0, -1).reverse()) {
    const label = humanizeToken(segment);
    if (label) return label;
  }
  return null;
}

function changeSize(file: ChangedFileSummary): number {
  return (file.lines_added ?? 0) + (file.lines_removed ?? 0);
}

export function topPublicChangedFiles(files: readonly ChangedFileSummary[]): readonly ChangedFileSummary[] {
  return [...files]
    .filter((file) => file.status !== 'deleted')
    .sort((a, b) => changeSize(b) - changeSize(a))
    .slice(0, 6);
}

export function publicFeatureLabels(git: GitMetrics): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const file of topPublicChangedFiles(git.changed_files)) {
    const label = publicFeatureLabelForPath(file.path);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }
  return labels.slice(0, 4);
}

export function publicChangedAreaFromFile(file: ChangedFileSummary): string | null {
  const label = publicFeatureLabelForPath(file.path);
  if (!label) return null;
  const suffix = file.status === 'added' ? 'added' : file.status === 'renamed' ? 'renamed' : 'updated';
  return `${label} ${suffix}`;
}
