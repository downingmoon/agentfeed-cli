---
title: Backend Ingestion Token Lifecycle Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - ingestion
  - token-auth
  - token-rotation
  - refactor
status: done
related:
  - "[[Backend Ingestion Token Management Test Split 2026-06-10]]"
  - "[[Backend CLI Auth Lifecycle Test Split 2026-06-10]]"
---
# Backend Ingestion Token Lifecycle Test Split 2026-06-10

> [!success] Result
> Ingestion token auth/status and rotation lifecycle tests now live in focused backend contract files.

## What changed

- Added `tests/test_ingestion_token_auth_contracts.py` for ingestion token bearer auth, active/deleted/expired user handling, context metadata, and status response safety.
- Added `tests/test_ingestion_token_rotation_contracts.py` for rotation semantics, quota-full replacement, token-authenticated rotation rejection, managed rotation response/audit behavior.
- Moved 10 tests out of `tests/test_contracts.py`.
- Kept both new files under the 250 pure LOC ceiling.
- Size movement:
  - `tests/test_contracts.py`: 8,019 -> 7,772 pure LOC.
  - `tests/test_ingestion_token_auth_contracts.py`: 118 pure LOC.
  - `tests/test_ingestion_token_rotation_contracts.py`: 139 pure LOC.

## Verification evidence

- Pre-split target selection: `10 passed, 299 deselected in 0.48s`.
- Focused split files: `10 passed in 0.96s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_ingestion_token_auth_contracts.py tests/test_ingestion_token_rotation_contracts.py` -> `All checks passed!`.
- Backend full suite: `428 passed, 1 warning in 3.27s` and again in cross-repo verification `428 passed, 1 warning in 1.82s`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- No server deployment was performed in this pass.
- No live remote API exercise.
- Ingestion/worklog source identity and worklog response contract tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
- Continue reducing `tests/test_contracts.py` surface by cohesive feature boundary.
