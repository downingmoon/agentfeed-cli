import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('API response contract boundaries', () => {
  it('keeps the shared data envelope parser at the unknown HTTP boundary', () => {
    const contract = source('src/api/response-contract.ts');
    const client = source('src/api/client.ts');

    expect(contract).toContain('export function responseDataEnvelope(');
    expect(contract).toContain('): unknown {');
    expect(contract).toContain('return value.data;');
    expect(contract).not.toContain('responseDataEnvelope<T>');
    expect(contract).not.toContain('return value.data as T');
    expect(client).not.toContain('responseDataEnvelope<');
  });
});
