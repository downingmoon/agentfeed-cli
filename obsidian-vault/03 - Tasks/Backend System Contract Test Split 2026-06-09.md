---
title: Backend System Contract Test Split 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - system-routes
  - readiness
  - metadata
  - refactor
status: done
related:
  - "[[Backend System Routes Module Split 2026-06-09]]"
  - "[[Backend Error Contract Test Split 2026-06-09]]"
  - "[[Backend OpenAPI Contract Module Split 2026-06-09]]"
---

# Backend System Contract Test Split 2026-06-09

> [!success] Result
> Readiness and metadata route contract tests now live in a focused backend test file instead of the monolithic `tests/test_contracts.py` suite.

## What changed

- Added `tests/test_system_contracts.py` for system-route contracts owned by `app/system_routes.py`.
- Moved 7 tests:
  - `test_readiness_ok_with_database_and_migration_match`
  - `test_readiness_returns_503_when_database_unavailable`
  - `test_readiness_reports_revision_lookup_failures_safely`
  - `test_readiness_returns_503_when_migration_revision_is_stale`
  - `test_readiness_reports_migration_head_failures_safely`
  - `test_api_metadata_exposes_client_compatibility_contract`
  - `test_metadata_route_has_response_model`
- Size movement:
  - `tests/test_contracts.py`: 9,680 → 9,523 pure LOC.
  - `tests/test_system_contracts.py`: 158 pure LOC.

## Why this improves enterprise readiness

- Keeps readiness/metadata behavior covered while making the contract suite easier to review by API surface.
- Reduces future risk of accidental contract drift because system route changes now have a smaller, named test target.
- Continues the behavior-preserving cleanup path without adding product features or touching server/infra/CICD.

## Verification evidence

- Pre-split target behavior lock:
  - `uv run --locked --group dev pytest tests/test_contracts.py -k 'readiness_ok_with_database_and_migration_match or readiness_returns_503_when_database_unavailable or readiness_reports_revision_lookup_failures_safely or readiness_returns_503_when_migration_revision_is_stale or readiness_reports_migration_head_failures_safely or api_metadata_exposes_client_compatibility_contract or metadata_route_has_response_model'`
  - Result: 7 passed, 1 warning.
- Split-file check:
  - `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_system_contracts.py`
  - Result: passed.
  - `uv run --locked --group dev pytest tests/test_system_contracts.py`
  - Result: 7 passed, 1 warning.
- Backend full suite:
  - `uv run --locked --group dev pytest`
  - Result: 428 passed, 1 warning.
- Cross-repo contract gate:
  - `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs`
  - Result: passed; 75 operations, 70 client contracts, 347 strict client JSON error responses.
- Cross-repo full verification:
  - `cd ../agentfeed-dev && bash scripts/test-all.sh`
  - Result: passed, including CLI 591 tests, CLI release preflight, frontend CI/build, backend 428 tests, and Alembic offline migration chain.

## Not done

- No server deployment was performed.
- No live remote API was exercised.
- `tests/test_contracts.py` remains intentionally oversized and needs continued surface-by-surface splitting.

## Follow-ups

- [ ] Split request-boundary and middleware contract tests into dedicated files.
- [ ] Split auth and CLI browser auth contract tests.
- [ ] Split ingestion/worklog source identity contract tests.
- [ ] Split profile/settings/search/explore/public discovery contract tests.
