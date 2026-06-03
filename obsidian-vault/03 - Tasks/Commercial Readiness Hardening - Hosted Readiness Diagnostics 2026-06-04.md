---
title: Commercial Readiness Hardening - Hosted Readiness Diagnostics
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/hosted-readiness
  - agentfeed/ci
  - agentfeed/diagnostics
status: implemented
aliases:
  - Hosted Readiness Diagnostics 2026-06-04
---

# Commercial Readiness Hardening - Hosted Readiness Diagnostics

Related: [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]], [[Commercial Readiness Hardening - Test Browser Guard and CI Dependency Gates 2026-06-03]], [[Commercial Readiness Hardening - Windows DPAPI Native CI 2026-06-03]]

## Outcome

- Frontend hosted-readiness preflight remains fail-closed, but now reports actionable root redirect and stale-body diagnostics.
- Frontend now has a production `deploy.env.example` documenting canonical hosted URLs without advertising skip flags.
- Dev hosted compatibility smoke evidence now preserves `frontend_root_response` with status, redirect location, content type, body hash, and bounded snippet.
- CLI timeout collector test was hardened after integration verification exposed a load-sensitive 50ms timeout contract.

> [!warning] Remaining external blocker
> As of 2026-06-04, `api.agentfeed.dev` still does not resolve and `https://agentfeed.dev/` still redirects to `/login`. Code-side guardrails are improved, but hosted production readiness still needs DNS/deployment routing correction outside the repositories.

## Hosted state evidence

```text
api DNS: <empty>
api health HEAD: curl: (6) Could not resolve host: api.agentfeed.dev
api metadata HEAD: curl: (6) Could not resolve host: api.agentfeed.dev
frontend root HEAD: HTTP/2 307, location: /login
```

Frontend preflight with canonical hosted env now reports:

```text
HOSTED_READINESS_PREFLIGHT_FAILED
- API host did not resolve before hosted readiness check: api.agentfeed.dev. Check DNS/deployment for https://api.agentfeed.dev. Resolver error: getaddrinfo ENOTFOUND api.agentfeed.dev
- Frontend root redirected to /login (307) for https://agentfeed.dev/ location=/login
```

## Changes

### agentfeed-frontend

- `scripts/hosted-readiness-preflight.mjs`
  - Added `body_sha256` and bounded `body_snippet` diagnostics when the root page returns 200 but lacks the landing marker.
  - Added redirect `location=/login` to root redirect failures.
- `scripts/hosted-readiness-preflight.contract.test.mjs`
  - Locked the missing-marker hash/snippet diagnostic contract.
- `scripts/ci-workflow.contract.test.mjs`
  - Locked the production deploy env template contract.
- `deploy.env.example`
  - Documents `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev`.
  - Documents `AGENTFEED_HOSTED_FRONTEND_URL=https://agentfeed.dev/`.
  - Intentionally omits hosted compatibility skip flags.

### agentfeed-dev

- `scripts/smoke-hosted-compatibility.sh`
  - Captures frontend root response evidence for failure JSON.
  - Preserves root `status`, `location`, `content_type`, `body_sha256`, and bounded `body_snippet` when available.
- `scripts/test-hosted-compatibility-smoke.sh`
  - Locks stale frontend evidence shape for `/login` redirects.

### AgentFeed-CLI

- `tests/test-command.test.ts`
  - Raised the bounded command timeout test from 50ms to 500ms.
  - Reason: under integration load, a normal follow-up Node build command could exceed 50ms and be counted as failed, causing false `failed_commands=2` failures. The contract still proves that a long-running command times out and collection continues within 2 seconds.

## Verification

> [!success] Frontend verification
> - `node --check scripts/hosted-readiness-preflight.mjs`
> - `node scripts/hosted-readiness-preflight.contract.test.mjs`
> - `node scripts/ci-workflow.contract.test.mjs`
> - `npm run test:contracts`
> - `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run check:api-compatibility:mock`
> - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`
> - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 npm run ci`

> [!success] Dev verification
> - `bash -n scripts/smoke-hosted-compatibility.sh`
> - `./scripts/test-hosted-compatibility-smoke.sh`
> - `./scripts/test-all.sh`

> [!success] CLI verification
> - `npm test -- --run tests/test-command.test.ts`
> - `npm run release:preflight`
> - Indirectly revalidated by dev `./scripts/test-all.sh`.

## Next operator action

1. Point `api.agentfeed.dev` DNS to the deployed API host.
2. Ensure `https://agentfeed.dev/` serves the public landing root instead of redirecting `/` to `/login`.
3. Re-run strict hosted CI/readiness after DNS propagation.
