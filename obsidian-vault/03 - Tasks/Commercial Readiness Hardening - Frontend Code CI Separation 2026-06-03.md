---
title: Commercial Readiness Hardening - Frontend Code CI Separation 2026-06-03
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/ci
status: done
aliases:
  - Frontend Code CI Separation 2026-06-03
---

# Commercial Readiness Hardening - Frontend Code CI Separation 2026-06-03

## Decision

Frontend now has a separate lightweight `Code CI` workflow for code, contract, mock API compatibility, audit, and production build validation without requiring hosted DNS.

The existing strict `CI` workflow remains fail-closed for hosted readiness and production API compatibility. This means:

- Code regressions get an always-runnable green/red signal.
- Hosted deployment failures remain visible and cannot be hidden with skip flags.
- Current hosted blocker is still explicit: `api.agentfeed.dev` DNS and `agentfeed.dev` root redirect.

> [!success] Verification
> - RED: `node scripts/ci-workflow.contract.test.mjs` failed because `.github/workflows/code-ci.yml` did not exist.
> - GREEN: `node scripts/ci-workflow.contract.test.mjs && npm run test:contracts`
> - Local Code CI mirror: `npm run lint`; `npm audit --omit=dev --audit-level=moderate`; `NEXT_PUBLIC_API_URL=http://localhost:8000 npm run check:api-compatibility:mock`; `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`

## Scope

- Frontend: `.github/workflows/code-ci.yml`, `scripts/ci-workflow.contract.test.mjs`
- Vault documentation: this note

## Remaining hosted blocker

The strict hosted CI will still fail until deployment is fixed:

- `api.agentfeed.dev` does not resolve.
- `https://agentfeed.dev/` returns HTTP `307` to `/login` for root.

