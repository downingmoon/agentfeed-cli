import { describe, expect, it } from 'vitest';
import { resolveApiBaseUrl } from '../src/config/api-base.js';

describe('API base URL contract', () => {
  it('rejects API roots that omit the backend /v1 contract path', async () => {
    await expect(resolveApiBaseUrl({ explicitApiBaseUrl: 'https://api.agentfeed.dev' }))
      .rejects.toThrow(/must end with \/v1/i);
  });
});
