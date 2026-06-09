---
title: Backend Ingestion Source Identity Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - ingestion
  - source-identity
  - worklog
  - idempotency
  - refactor
status: done
related:
  - "[[Backend Ingestion Token Lifecycle Test Split 2026-06-10]]"
  - "[[Backend Ingestion Token Management Test Split 2026-06-10]]"
---
# Backend Ingestion Source Identity Test Split 2026-06-10

> [!success] Result
> Ingestion source identity schema, idempotency hash, unique-index, and conflict contract tests now live in a focused backend contract file.

## What changed

- Added `tests/test_ingestion_source_identity_contracts.py` for source identity preservation, stable identity validation, source identity candidate priority/hash stability, worklog unique source-identity index, and stale-reuse conflict behavior.
- Moved 7 tests out of `tests/test_contracts.py` without changing behavior.
- Kept local fakes inside the new test file so the split file does not depend on the oversized `tests/test_contracts.py` module.
- Size movement by `wc -l`:
  - `tests/test_contracts.py`: `9,034` lines after split.
  - `tests/test_ingestion_source_identity_contracts.py`: `169` lines.

## Verification evidence

- Pre-split target selection: `7 passed, 292 deselected in 0.41s`.
- Focused split file: `7 passed in 0.41s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_ingestion_source_identity_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run --locked --group dev pytest` → `428 passed, 1 warning in 1.73s`.
- Cross-repo OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with `75` operations, `70` client contracts, and `347` strict client JSON error response checks.
- Cross-repo full gate: `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh` completed successfully, including CLI tests, frontend build/typecheck/audit, backend tests, and alembic offline migration chain.

## Not done

- No feature behavior was changed.
- No schema/API contract was changed.
- Personal server deployment is handled as a separate final step for this work pass, per user request.

## Follow-ups

- Split worklog card hydration and public source projection tests from `tests/test_contracts.py`.
- Split worklog review/public response contract tests.
- Continue reducing `tests/test_contracts.py` by cohesive feature boundary while preserving the cross-repo gate.
