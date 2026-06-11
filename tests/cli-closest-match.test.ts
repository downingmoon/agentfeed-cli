import { describe, expect, it } from 'vitest';
import { closestMatch } from '../src/cli/closest-match.js';

describe('CLI closest match suggestions', () => {
  it('suggests close command typos within the edit-distance threshold', () => {
    expect(closestMatch('stats', ['status', 'share', 'scan'])).toBe('status');
    expect(closestMatch('compltion', ['completion', 'collect', 'commands'])).toBe('completion');
  });

  it('breaks distance ties by shared prefix length', () => {
    expect(closestMatch('--sorce', ['--force', '--source'])).toBe('--source');
  });

  it('does not suggest distant candidates', () => {
    expect(closestMatch('zzzzzz', ['status', 'share', 'scan'])).toBeNull();
    expect(closestMatch('status', [])).toBeNull();
  });
});
