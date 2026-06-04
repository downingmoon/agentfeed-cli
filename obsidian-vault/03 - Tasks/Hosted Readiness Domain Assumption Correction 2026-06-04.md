---
title: Hosted Readiness Domain Assumption Correction 2026-06-04
date: 2026-06-04
tags:
  - agentfeed
  - hosted-readiness
  - ci
  - commercial-readiness
status: completed
aliases:
  - Domainless Hosted Readiness Correction
---

# Hosted Readiness Domain Assumption Correction 2026-06-04

## Context

`agentfeed.dev` was being treated as the canonical hosted Frontend/API domain in several CI and readiness paths, but no production domain is currently prepared.

> [!bug] Wrong assumption
> `agentfeed.dev` was an implementation-time placeholder, not a configured production domain. Push CI must not fail because a placeholder domain is unavailable.

## Decision

- Keep ordinary push/pull-request CI focused on source, contracts, mock API compatibility, and local-build validation.
- Make hosted readiness a manual, explicit-URL gate.
- Require operators to provide deployed Frontend/API URLs before hosted or commercial readiness can be claimed.

## Changes

### [[agentfeed-frontend]]

- Converted `.github/workflows/ci.yml` from push/pull-request hosted CI to manual `workflow_dispatch` only.
- Added required `api_url` and `frontend_url` inputs.
- Replaced `deploy.env.example` values with neutral placeholders:
  - `https://api.example.com`
  - `https://app.example.com/`
- Updated frontend contract tests so hardcoded `agentfeed.dev` is no longer required in workflow defaults.

### [[agentfeed-dev]]

- Removed default `https://api.agentfeed.dev/v1` and `https://agentfeed.dev` from hosted smoke scripts/workflows.
- `scripts/smoke-hosted-compatibility.sh` now fails fast unless:
  - `AGENTFEED_HOSTED_API_BASE_URL` is set
  - `AGENTFEED_HOSTED_FRONTEND_URL` is set
- Updated README and workflow contracts to describe explicit hosted URLs instead of a default domain.

## Verification

> [!success] Passed
> - Frontend: `npm run lint && npm run test:contracts && NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 npm run build`
> - Dev: `./scripts/test-hosted-compatibility-smoke.sh`
> - Dev: `./scripts/test-commercial-readiness-gate.sh`
> - Dev: `./scripts/test-workflow-validity.sh`
> - Dev: URL-less hosted smoke exits with `AGENTFEED_HOSTED_API_BASE_URL is required` instead of probing `agentfeed.dev`.

## Remaining

- Choose an actual production domain later.
- Configure hosted Backend and Frontend deployment URLs.
- Re-run manual hosted readiness with explicit URLs.

Related: [[Active Tasks]]
