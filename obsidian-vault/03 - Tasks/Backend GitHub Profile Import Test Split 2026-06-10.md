---
title: Backend GitHub Profile Import Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - auth
  - github
  - profile-import
  - username
  - refactor
status: done
related:
  - "[[Backend GitHub OAuth Contract Test Split 2026-06-10]]"
  - "[[Backend Provider Token Contract Test Split 2026-06-10]]"
---
# Backend GitHub Profile Import Test Split 2026-06-10

> [!success] Result
> GitHub profile import, sanitized blog URL, username collision retry, missing-login, and missing-provider-id tests now live in a focused backend contract file.

## What changed

- Added `tests/test_github_profile_import_contracts.py` for GitHub profile import and username derivation contracts.
- Moved 5 async tests out of `tests/test_contracts.py`.
- Kept the new profile import contract file under the 250 pure LOC ceiling.
- Size movement:
  - `tests/test_contracts.py`: 8,226 -> 8,111 pure LOC.
  - `tests/test_github_profile_import_contracts.py`: 120 pure LOC.

## Verification evidence

- Pre-split target selection: `5 passed, 314 deselected in 0.59s`.
- Focused split file: `5 passed in 0.65s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_github_profile_import_contracts.py` -> `All checks passed!`.
- Backend full suite: `428 passed, 1 warning in 2.27s` and again in cross-repo verification `428 passed, 1 warning in 1.96s`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- Live remote API was not exercised during this refactor verification pass.
- Ingestion token management tests remain in `tests/test_contracts.py`.
- Ingestion/worklog source identity and worklog response contract tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split ingestion token management tests.
- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
- Continue reducing `tests/test_contracts.py` surface by cohesive feature boundary.
