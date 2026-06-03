---
title: Commercial Readiness Hardening - Lock Fingerprint Hostname and Compatibility Probes
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/compatibility
status: implemented
aliases:
  - Lock Fingerprint Hostname Compatibility 2026-06-04
---

# Commercial Readiness Hardening - Lock Fingerprint Hostname and Compatibility Probes

Related: [[Active Tasks]], [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]], [[Commercial Readiness Hardening - Frontend Core API Compatibility Probes 2026-06-03]], [[Commercial Readiness Hardening - CLI Concurrent Publish Serialization 2026-06-02]]

## Outcome

- CLI draft upload lock no longer persists raw lock tokens and uses heartbeat freshness instead of PID-only liveness for stale lock cleanup.
- CLI duplicate draft fingerprint now includes upload-affecting project/collection policy, so config changes do not silently reuse stale draft content.
- Backend production/staging public host validation now rejects syntactically malformed hostnames before accepting them as public DNS names.
- Frontend API compatibility probe now covers auth/session, `/me`, projects, username check, and search surfaces with non-mutating GET requests.

> [!success] Integration status
> Code-side commercial-readiness gaps found in the latest parallel audit were patched and verified across CLI, backend, and frontend. Hosted production remains blocked only by the known external DNS/root-routing issue tracked in [[Commercial Readiness Hardening - Hosted Readiness Diagnostics 2026-06-04]].

## Changes

### AgentFeed-CLI

- `src/api/client.ts`
  - Replaced raw upload lock `token` persistence with `token_hash`.
  - Added upload lock heartbeat via file mtime refresh.
  - Treats old heartbeat/mtime locks as stale even if an unrelated live process reused the recorded PID.
- `src/draft/create.ts`
  - Added normalized collection policy inputs to `collection_fingerprint`.
  - Includes project name/repository/visibility/tags and collection inclusion flags.
- `tests/api-hook.test.ts`
  - Locks token non-persistence and PID reuse stale-lock cleanup.
- `tests/duplicate-draft.test.ts`
  - Locks non-reuse when file-stat policy or project tags change uploadable output.

### agentfeed-backend

- `app/config.py`
  - Added DNS label syntax validation for production public URLs/origins and API allowed hosts.
  - Keeps existing global-IP, localhost, private suffix, and wildcard host policies.
- `tests/test_contracts.py`
  - Rejects malformed `FRONTEND_URL`, `ALLOWED_ORIGINS`, and `API_ALLOWED_HOSTS` in production.
  - Confirms `api.agentfeed.dev` remains accepted.

### agentfeed-frontend

- `scripts/check-api-compatibility.mjs`
  - Added safe GET compatibility probes for `/auth/me`, `/me/settings`, `/me/notifications`, `/projects`, `/users/check-username`, and `/search`.
  - Validates standard error envelope for unauthenticated responses.
- `scripts/mock-api-compatibility-check.mjs`
  - Mock server covers and counts the expanded probe set.
- Contract tests
  - Updated probe marker to `metadata feed auth-me me-settings me-notifications projects check-username search tags explore`.

## Verification

> [!success] CLI
> - `npm test -- --run tests/api-hook.test.ts tests/duplicate-draft.test.ts` → 95 tests passed
> - `npm run typecheck` → passed
> - `npm run release:preflight` → build, typecheck, 393 tests, npm pack/install smoke passed

> [!success] Backend
> - `.venv/bin/python -m pytest tests/test_contracts.py -q -k 'production_settings'` → 18 passed
> - `.venv/bin/ruff check app/config.py tests/test_contracts.py` → passed
> - `.venv/bin/python -m pytest -q` → 366 passed, 1 known StarletteDeprecationWarning

> [!success] Frontend
> - `node scripts/check-api-compatibility.contract.test.mjs && node scripts/api-compatibility-mock.contract.test.mjs` → passed
> - `npm run check:api-compatibility:mock` → expanded marker passed
> - `npm run lint` → passed
> - `npm test` → contract suite passed

## Push and CI evidence

- AgentFeed-CLI `ee5f891` pushed to `main`.
  - GitHub Actions `CI` run `26895993755` passed.
- agentfeed-backend `6817ea7` pushed to `master`.
  - GitHub Actions `CI` run `26895994868` passed.
- agentfeed-frontend `471fce6` pushed to `main`.
  - GitHub Actions `Code CI` run `26895994239` passed.
  - GitHub Actions strict hosted `CI` run `26895994182` failed only at hosted readiness preflight with known external blockers:
    - `api.agentfeed.dev` DNS `ENOTFOUND`
    - `https://agentfeed.dev/` root redirects to `/login` with 307

## Remaining

- [ ] External: fix `api.agentfeed.dev` DNS and `https://agentfeed.dev/` stale `/login` redirect, then rerun strict hosted readiness.
