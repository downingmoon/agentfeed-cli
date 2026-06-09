---
title: Backend Provider Token Contract Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - auth
  - oauth
  - provider-token
  - refactor
status: done
related:
  - "[[Backend CLI Auth Lifecycle Test Split 2026-06-10]]"
  - "[[Backend Auth Contract Test Split 2026-06-10]]"
---
# Backend Provider Token Contract Test Split 2026-06-10

> [!success] Result
> Provider token encryption, legacy-token cleanup, and GitHub provider identity persistence tests now live in a dedicated backend contract file.

## What changed

- Added `tests/test_provider_token_contracts.py` for provider token encryption/decryption/rotation, provider identity uniqueness, and GitHub OAuth token non-persistence behavior.
- Moved 8 tests out of `tests/test_contracts.py`.
- Moved `FakeAuditRequest` into `tests/contract_fakes.py` so extracted OAuth tests can share the same request-id fake without importing the oversized contract module.
- Size movement:
  - `tests/test_contracts.py`: 8,603 -> 8,442 pure LOC.
  - `tests/contract_fakes.py`: 78 -> 82 pure LOC.
  - `tests/test_provider_token_contracts.py`: 168 pure LOC.

## Verification evidence

- Pre-split target selection: `8 passed, 326 deselected in 0.86s`.
- Focused split file: `8 passed in 0.54s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/contract_fakes.py tests/test_provider_token_contracts.py` -> `All checks passed!`.
- Backend full suite: `428 passed, 1 warning in 2.32s` and again in cross-repo verification `428 passed, 1 warning in 2.11s`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- No server deployment.
- No live remote API exercise.
- GitHub OAuth state/session callback tests remain in `tests/test_contracts.py`.
- Ingestion token management tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split GitHub OAuth state/callback cookie/session tests.
- Split ingestion token management tests.
- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
