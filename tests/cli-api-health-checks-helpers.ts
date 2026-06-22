import { afterEach, vi } from 'vitest';

const oldAgentFeedAllowInsecureApi = process.env.AGENTFEED_ALLOW_INSECURE_API;

export function useApiHealthCheckEnvironment(): void {
  afterEach(() => {
    if (oldAgentFeedAllowInsecureApi === undefined) delete process.env.AGENTFEED_ALLOW_INSECURE_API;
    else process.env.AGENTFEED_ALLOW_INSECURE_API = oldAgentFeedAllowInsecureApi;
    vi.unstubAllGlobals();
  });
}
