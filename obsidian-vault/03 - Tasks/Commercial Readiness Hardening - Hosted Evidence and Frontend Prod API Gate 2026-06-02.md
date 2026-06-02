---
title: Commercial Readiness Hardening - Hosted Evidence and Frontend Prod API Gate 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev
  - agentfeed/frontend
  - agentfeed/operations
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Hosted smoke evidence artifacts
  - Frontend production API compatibility opt-in gate
---

# Hosted evidence and Frontend production API gate

> [!success]
> Commercial-readiness evidence is now durable for hosted compatibility smoke, and Frontend CI has an opt-in guard that checks the same production API URL used for the production build before building.

## Context

- Builds on [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]] and [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]].
- Related area: [[Runtime Configuration]].
- Integration map: [[Integration - CLI Backend Frontend]].

## Problems

1. Hosted compatibility smoke proved metadata/readiness/doctor/frontend checks in terminal output, but successful hosted proof was not persisted as a machine-readable artifact.
2. `make commercial-readiness` retained OAuth live evidence, but not hosted compatibility evidence or per-step logs in the manifest.
3. Frontend CI always ran mock API compatibility before build, but had no opt-in path to check the actual `NEXT_PUBLIC_API_URL` used for a production build.

## Contract

### Hosted/commercial evidence

1. `AGENTFEED_SMOKE_EVIDENCE_DIR` persists hosted smoke artifacts.
2. Successful hosted smoke writes:
   - `hosted-compatibility-evidence.json`
   - `metadata.json`
   - `readiness.json`
   - `doctor.txt`
   - `frontend-api-compatibility.txt`
   - `frontend-root.html`
3. The evidence JSON includes URL config, repo SHAs, artifact names, check booleans, and `HOSTED_COMPATIBILITY_SMOKE_PASSED`.
4. Hosted compatibility workflow uploads a pinned `hosted-compatibility-evidence` artifact.
5. `make commercial-readiness` manifest includes `hosted_compatibility_evidence`, `oauth_live_evidence`, `step_logs`, and `step_results`.

### Frontend production API compatibility

1. Default `npm run ci` remains hosted-DNS independent and still runs mock compatibility.
2. `AGENTFEED_VERIFY_PROD_API_COMPAT=1 npm run ci` runs `npm run check:api-compatibility` with `NEXT_PUBLIC_API_URL` equal to the production build API URL.
3. If production API compatibility fails, the production build step does not run.

## Changes

- Dev `scripts/smoke-hosted-compatibility.sh`
  - Added `AGENTFEED_SMOKE_EVIDENCE_DIR` support.
  - Added durable hosted evidence files and JSON summary.
- Dev `scripts/commercial-readiness.sh`
  - Captures per-step logs.
  - Records hosted/OAuth evidence paths and step results in `manifest.json`.
- Dev `.github/workflows/hosted-compatibility.yml`
  - Uploads `hosted-compatibility-evidence` artifact using SHA-pinned `actions/upload-artifact`.
- Dev contract tests
  - Added hosted evidence, workflow artifact, manifest, and README assertions.
- Frontend `scripts/run-ci.mjs`
  - Added `AGENTFEED_VERIFY_PROD_API_COMPAT=1` opt-in compatibility step before build.
- Frontend `scripts/run-ci.contract.test.mjs`
  - Added opt-in step-order/env propagation regression.
  - Added failure propagation regression proving build is blocked.

## Verification evidence

> [!example] RED — hosted evidence gap
> `./scripts/test-hosted-compatibility-smoke.sh && ./scripts/test-commercial-readiness-gate.sh` failed after adding source-contract assertions because hosted smoke did not support `AGENTFEED_SMOKE_EVIDENCE_DIR`, `hosted-compatibility-evidence.json`, or workflow artifact upload.

> [!example] RED — Frontend production API compatibility gap
> `node scripts/run-ci.contract.test.mjs` failed with step order `run lint`, `run test`, `run check:api-compatibility:mock`, `run build`; the opt-in production compatibility step was missing.

> [!success] GREEN — Dev targeted contracts
> `./scripts/test-hosted-compatibility-smoke.sh` passed.
>
> `./scripts/test-commercial-readiness-gate.sh` passed.
>
> `bash -n scripts/smoke-hosted-compatibility.sh scripts/commercial-readiness.sh && ./scripts/check-action-pins.sh` passed.

> [!success] GREEN — hosted evidence dynamic mock
> Mock Frontend/API run of `scripts/smoke-hosted-compatibility.sh` with `AGENTFEED_SMOKE_EVIDENCE_DIR` passed and produced `doctor.txt`, `frontend-api-compatibility.txt`, `frontend-root.html`, `hosted-compatibility-evidence.json`, `metadata.json`, and `readiness.json`.

> [!success] GREEN — Frontend contracts and CI
> `node scripts/run-ci.contract.test.mjs` passed.
>
> `bash -lc 'rm -rf .tmp-api-compatibility-* && npm run test:contracts'` passed.
>
> `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed.

> [!success] GREEN — cross-repo gate
> `agentfeed-dev ./scripts/test-all.sh` passed across dev contracts, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend Ruff/tests/Alembic offline chain, and OpenAPI contract gate.

## Remaining risk

> [!warning]
> The hosted evidence mechanism is now source-controlled and verified with local mocks. The real production proof still requires `https://agentfeed.dev` and `https://api.agentfeed.dev/v1` to be deployed and healthy so default `make commercial-readiness` can pass.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02]]
- [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]
