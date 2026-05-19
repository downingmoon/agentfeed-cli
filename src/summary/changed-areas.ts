import type { ChangedFileSummary } from '../types.js';

const rules: Array<[RegExp, string]> = [
  [/(^|\/)(test|tests|spec|__tests__)(\/|\.|$)/i, 'Test coverage'],
  [/(docker|compose|Dockerfile)/i, 'Docker deployment'],
  [/(^|\/)\.github\/|workflow|\bci\b/i, 'CI/CD workflow'],
  [/(api|routes|controller)/i, 'API layer'],
  [/(component|ui|page)/i, 'UI components'],
  [/(auth|login|session)/i, 'Authentication'],
  [/(db|migration|schema|prisma)/i, 'Database layer'],
  [/(config|env|settings)/i, 'Configuration'],
  [/(docs|readme)/i, 'Documentation'],
  [/(package\.json|pnpm-lock|package-lock)/i, 'Package configuration'],
  [/(pyproject\.toml)/i, 'Python project configuration']
];

export function changedAreas(files: ChangedFileSummary[]): string[] {
  const areas = new Set<string>();
  for (const file of files) {
    const match = rules.find(([regex]) => regex.test(file.path));
    areas.add(match?.[1] ?? 'Application code');
    if (areas.size >= 8) break;
  }
  return [...areas].slice(0, 8);
}
