---
title: Commercial Readiness Hardening - Local CI Env Isolation
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - ci/local-reproducibility
  - testing/contracts
status: verified
aliases:
  - Local CI Env Isolation 2026-06-03
---

# Commercial Readiness Hardening - Local CI Env Isolation

Related: [[Commercial Readiness Hardening - CLI Authorize Source Contracts 2026-06-03]] · [[Home]]

## Outcome

Frontend `npm run ci` now isolates the local-production-build override from non-build gates.

- `AGENTFEED_ALLOW_LOCAL_API_BUILD=1` can be used for trusted local builds against `localhost`.
- Typecheck, dependency audit, contract tests, mock compatibility, hosted readiness, and production API compatibility explicitly remove that build-only override.
- Production build still receives the override when the operator intentionally runs a local DNS-less CI reproduction.

> [!success] Commercial-readiness impact
> Developers can reproduce the frontend CI locally without weakening API URL safety contracts or relying on GitHub-only workflow step scoping.

## TDD Evidence

### RED

```bash
npm run test:contracts -- scripts/run-ci.contract.test.mjs
```

Result: failed because the local API build override leaked into non-build CI steps.

### GREEN

```bash
npm run test:contracts
```

Result: passed.

### Real local CI reproduction

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 \
AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
AGENTFEED_SKIP_PROD_API_COMPAT=1 \
AGENTFEED_LOCAL_DNSLESS_CI=1 \
npm run ci
```

Result: passed typecheck, production dependency audit, contract tests, mock API compatibility, and production build.

## Remaining External Blocker

> [!warning] Hosted strict gate
> Production hosted readiness is still external-infrastructure blocked until `api.agentfeed.dev` DNS resolves and `https://agentfeed.dev/` serves the public landing page instead of redirecting to `/login`.
