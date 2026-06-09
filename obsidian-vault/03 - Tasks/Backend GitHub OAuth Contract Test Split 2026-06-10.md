---
title: Backend GitHub OAuth Contract Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - auth
  - github
  - oauth
  - session-cookie
  - refactor
status: done
related:
  - "[[Backend Provider Token Contract Test Split 2026-06-10]]"
  - "[[Backend CLI Auth Lifecycle Test Split 2026-06-10]]"
---
# Backend GitHub OAuth Contract Test Split 2026-06-10

> [!success] Result
> GitHub OAuth login state, callback replay protection, session-cookie clearing, and missing OAuth app configuration tests now live in a focused backend contract file.

## What changed

- Added `tests/test_github_oauth_contracts.py` for GitHub OAuth browser-flow contract tests.
- Moved 7 async tests out of `tests/test_contracts.py`.
- Kept the new OAuth contract file under the 250 pure LOC ceiling.
- Size movement:
  - `tests/test_contracts.py`: 8,442 -> 8,226 pure LOC.
  - `tests/test_github_oauth_contracts.py`: 227 pure LOC.

## Verification evidence

- Pre-split target selection: `7 passed, 319 deselected in 1.47s`.
- Focused split file: `7 passed in 0.89s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_github_oauth_contracts.py` -> `All checks passed!`.
- Backend full suite: `428 passed, 1 warning in 4.08s` and again in cross-repo verification `428 passed, 1 warning in 1.99s`.
- OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with 75 operations and 70 client contracts checked.
- Cross-repo gate: `bash scripts/test-all.sh` completed successfully, including CLI 591 tests, frontend CI/build/contracts, backend lint/tests, and Alembic offline migration chain.

## Not done

- No server deployment.
- No live remote API exercise.
- GitHub profile import/username collision tests remain in `tests/test_contracts.py`.
- Ingestion token management tests remain in `tests/test_contracts.py`.

## Follow-ups

- Split GitHub profile import and username collision tests.
- Split ingestion token management tests.
- Split ingestion/worklog source identity contract tests.
- Split worklog card/review/public response contract tests.
