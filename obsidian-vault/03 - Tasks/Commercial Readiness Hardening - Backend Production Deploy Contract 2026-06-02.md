---
title: Commercial Readiness Hardening - Backend Production Deploy Contract 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/backend
  - agentfeed/operations
  - agentfeed/deployment
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Backend production deploy contract
  - Production startup and JWT config gate
---

# Backend production deploy contract

> [!success]
> Backend now has a checked production deploy contract: production env example, release migration phase, platform-port startup script, production-mode app import smoke, and fail-closed JWT runtime settings.

## Context

- Builds on [[Commercial Readiness Hardening - Backend Health Readiness Rate Limits 2026-06-02]] and [[Commercial Readiness Hardening - Production Config Private Host and CI Env Gates 2026-06-01]].
- Related area: [[Runtime Configuration]]
- Integration map: [[Integration - CLI Backend Frontend]]

## Problem

The Backend had strong runtime validation, private OpenAPI/docs in production, and readiness checks, but no deployment artifact described how a hosted platform should start it. A sidecar audit also found that `ALGORITHM=none` and non-positive `ACCESS_TOKEN_EXPIRE_MINUTES` could instantiate `Settings`.

## Contract

1. `deploy.env.example` is a production-only env contract and is intentionally distinct from local `.env.example`.
2. Production deploy env uses public AgentFeed domains, `DATABASE_URL?...ssl=require`, non-default `SECRET_KEY`, and `RATE_LIMIT_STORE=auto` so production resolves to the database-backed limiter.
3. `Procfile` has a `release` migration phase before the `web` process.
4. `scripts/start-production.sh` binds `0.0.0.0`, uses `${PORT:-8000}`, and never uses `--reload`.
5. CI imports `app.main` with the production deploy env and asserts production docs/OpenAPI are disabled.
6. Settings reject unsupported JWT algorithms and non-positive access-token expiry.

## Changes

- Backend `deploy.env.example`
  - Added placeholder-safe production env contract for hosted deployment.
- Backend `Procfile`
  - Added `release: uv run --locked alembic upgrade head`.
  - Added `web: ./scripts/start-production.sh`.
- Backend `scripts/start-production.sh`
  - Added portable production start command using platform `PORT`.
- Backend `app/config.py`
  - Added `SUPPORTED_JWT_ALGORITHMS={"HS256"}` and positive `ACCESS_TOKEN_EXPIRE_MINUTES` validation.
- Backend `tests/test_contracts.py`
  - Added deployment env/startup contract tests.
  - Added production-mode app import smoke.
  - Added unsafe JWT runtime config negative tests.

## Verification evidence

> [!example] RED — deploy artifact gap
> `uv run --locked --group dev pytest tests/test_contracts.py -k 'production_deploy_env_example or production_startup_artifacts'` failed because `deploy.env.example` and `Procfile` were missing.

> [!example] RED — migration phase and JWT gap
> `uv run --locked --group dev pytest tests/test_contracts.py -k 'production_deploy_env_example or production_startup_artifacts or unsafe_jwt'` failed because `Procfile` lacked the `release` migration phase and `Settings(ALGORITHM="none")` did not raise.

> [!success] GREEN — targeted Backend contract
> `uv run --locked --group dev pytest tests/test_contracts.py -k 'production_deploy_env_example or production_startup_artifacts or unsafe_jwt'` passed: 3 tests.

> [!success] GREEN — Backend full verification
> `uv run --locked --group dev ruff check .` passed.
>
> `uv run --locked --group dev pytest tests` passed: 296 tests, 1 known Starlette deprecation warning.
>
> `uv run --locked alembic heads && uv run --locked alembic upgrade head --sql > /tmp/agentfeed-backend-alembic-upgrade.sql` passed; migration head `019_audit_events`, generated SQL 490 lines.

> [!success] GREEN — cross-repo gate
> `agentfeed-dev ./scripts/test-all.sh` passed across dev contracts, CLI tests/typecheck/release preflight/audit, Frontend CI/build/audit, Backend Ruff/tests/Alembic offline chain, and OpenAPI contract gate.

## Remaining risk

> [!warning]
> This locks the Backend deploy/start contract in source and CI. It does not prove the hosted DNS/deployment is live. External release blocker remains: `https://agentfeed.dev/` is currently stale `/login` redirect and `api.agentfeed.dev` deployment/DNS must be completed before default `make commercial-readiness` can pass.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]
