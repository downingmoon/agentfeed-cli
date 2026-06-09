---
title: Backend Ingestion Token Management Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - ingestion
  - token-management
  - refactor
status: done
related:
  - "[[Backend GitHub Profile Import Test Split 2026-06-10]]"
  - "[[Backend CLI Auth Lifecycle Test Split 2026-06-10]]"
---
# Backend Ingestion Token Management Test Split 2026-06-10

> [!success] Result
> Ingestion token create/quota/name/list management tests now live in a focused backend contract file.

## What changed

- Added `tests/test_ingestion_token_management_contracts.py` for ingestion token owner locking, quota checks, request-name normalization, one-time token issuance, and token list expiry fields.
- Moved 5 tests out of `tests/test_contracts.py`.
- Kept the new ingestion token management contract file under the 250 pure LOC ceiling.
- Size movement:
  - `tests/test_contracts.py`: 8,111 -> 8,019 pure LOC.
  - `tests/test_ingestion_token_management_contracts.py`: 97 pure LOC.

## Verification evidence

- Pre-split target selection: `5 passed, 309 deselected in 0.54s`.
- Focused split file: `5 passed in 0.33s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_ingestion_token_management_contracts.py` -> `All checks passed!`.
- Backend full suite: `428 passed, 1 warning in 2.22s` and again in cross-repo verification `428 passed, 1 warning in 4.88s`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- No server deployment was performed in this pass.
- No live remote API exercise.
- Ingestion auth/status/rotation tests remain in `tests/test_contracts.py`.
- Ingestion/worklog source identity and worklog response contract tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split ingestion auth/status/rotation lifecycle tests.
- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
- Continue reducing `tests/test_contracts.py` surface by cohesive feature boundary.
