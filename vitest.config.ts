import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    env: {
      AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1'
    }
  }
});
