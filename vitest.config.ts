import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The release preflight runs CLI subprocess, git, tarball, and collector
    // smoke tests in parallel; keep the timeout above real subprocess latency
    // while still failing hung tests quickly.
    testTimeout: 20_000,
    environment: 'node',
    globals: false,
    restoreMocks: true,
    clearMocks: true,
    env: {
      AGENTFEED_TEST_DISABLE_REAL_BROWSER: '1'
    }
  }
});
