import { describe, expect, it } from 'vitest';
import { parseLongOptionToken } from '../src/cli/long-option-token.js';

describe('parseLongOptionToken', () => {
  it('parses bare and inline-value long options', () => {
    expect(parseLongOptionToken('--json')).toEqual({ name: '--json', inlineValue: null });
    expect(parseLongOptionToken('--api-base-url=https://api.example.test')).toEqual({
      name: '--api-base-url',
      inlineValue: 'https://api.example.test'
    });
    expect(parseLongOptionToken('--api-base-url=')).toEqual({ name: '--api-base-url', inlineValue: '' });
  });
});
