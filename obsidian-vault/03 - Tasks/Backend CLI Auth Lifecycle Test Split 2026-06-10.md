---
title: Backend CLI Auth Lifecycle Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - auth
  - cli-auth
  - lifecycle
  - refactor
status: done
related:
  - "[[Backend Auth Contract Test Split 2026-06-10]]"
  - "[[Backend Request Boundary Contract Test Split 2026-06-10]]"
  - "[[Backend System Contract Test Split 2026-06-09]]"
---
# Backend CLI Auth Lifecycle Test Split 2026-06-10

> [!success] Result
> CLI browser auth lifecycle tests now live in focused session/approval and exchange files, with shared fake DB helpers moved into a dedicated test support module.

## What changed

- Added `tests/contract_fakes.py` for shared fake DB/test response helpers.
- Added `tests/test_cli_auth_session_contracts.py` for create/status/approval/expiry behavior.
- Added `tests/test_cli_auth_exchange_contracts.py` for exchange/token issuance/rotation/deleted-user/quota behavior.
- Moved 12 async tests out of the oversized backend contract file.
- Size movement:
  - `tests/test_contracts.py`: 9,125 -> 8,603 pure LOC.
  - `tests/contract_fakes.py`: 78 pure LOC.
  - `tests/test_cli_auth_session_contracts.py`: 239 pure LOC.
  - `tests/test_cli_auth_exchange_contracts.py`: 233 pure LOC.

## Verification evidence

- Pre-split target selection: 12 passed, 334 deselected.
- Focused split files: `12 passed in 0.56s`.
- Backend full suite: `428 passed, 1 warning in 2.31s` and again in cross-repo verification `428 passed, 1 warning in 4.01s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/contract_fakes.py tests/test_cli_auth_session_contracts.py tests/test_cli_auth_exchange_contracts.py` -> `All checks passed!`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- No server deployment.
- No live remote API exercise.
- Provider token encryption/persistence and ingestion-token management tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split provider token encryption and provider identity persistence tests.
- Split ingestion token management tests.
- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
