import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const jsonBoundarySources = [
  'src/api/client.ts',
  'src/api/ingestion-token-status.ts',
  'src/api/metadata-response.ts',
  'src/api/response-contract.ts',
] as const;

const source = jsonBoundarySources.map((path) => readFileSync(path, 'utf8')).join('\n');

describe('API client JSON boundary', () => {
  it('keeps fetch response JSON at unknown before structural parsing', () => {
    expect(source).not.toContain('response.json() as');
    expect(source).toContain('const parsed: unknown = await response.json();');
  });
});
