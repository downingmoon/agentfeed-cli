---
title: Commercial Readiness Hardening - CLI Authorize Source Contracts
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/cli-auth
  - testing/contracts
status: verified
aliases:
  - CLI Authorize Source Contracts 2026-06-03
---

# Commercial Readiness Hardening - CLI Authorize Source Contracts

Related: [[Commercial Readiness Hardening - Ingestion Context Row Locks 2026-06-03]] · [[Home]]

## Outcome

Frontend `/cli/authorize` regression coverage was strengthened without adding a new component-test framework.

New source-contract assertions now lock these invariants:

- OAuth-returned CLI sessions can be recovered from `sessionStorage` after URL cleanup.
- Approval actions bind to the resolved session id, whether it came from the URL or storage.
- Retry scheduling clears prior timers before rescheduling.
- Effect cleanup marks in-flight async work as cancelled before clearing retry timers.

> [!info] Test-stack constraint
> The frontend currently uses custom Node/TypeScript contract tests, not mounted React tests. Adding real component execution coverage would require a deliberate dependency/script decision such as Vitest + JSDOM or Playwright.

## Verification Evidence

```bash
npm test -- src/lib/page-source-contract.test.ts
```

Result: passed.

```bash
npm run lint
```

Result: passed (`tsc --noEmit`).

```bash
npm audit --omit=dev --audit-level=moderate
```

Result: `found 0 vulnerabilities`.

```bash
npm run test:contracts
```

Result: passed.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run check:api-compatibility:mock
```

Result: `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`.

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build
```

Result: Next.js production build compiled successfully and generated all 18 static pages.

## Local CI Note

`npm run ci` was not used as the final local proof because passing `AGENTFEED_ALLOW_LOCAL_API_BUILD=1` to make the local build legal also propagates into contract tests. The GitHub `Code CI` workflow avoids that by applying the local-build override only to the build step.

## Remaining External Blocker

> [!warning] Strict hosted readiness
> The strict hosted workflow is still expected to fail until production infrastructure is fixed: `api.agentfeed.dev` DNS is unresolved and the hosted root currently redirects to `/login`.
