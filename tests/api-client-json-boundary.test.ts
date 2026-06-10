import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/api/client.ts', 'utf8');

describe('API client JSON boundary', () => {
  it('keeps fetch response JSON at unknown before structural parsing', () => {
    expect(source).not.toContain('response.json() as unknown');
    expect(source).not.toContain('response.json() as { data?: IngestionTokenStatus }');
    expect(source).toContain('const parsed: unknown = await response.json();');
  });
});
