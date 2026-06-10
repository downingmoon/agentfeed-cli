---
title: Backend Worklog Card Builder Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - card-builder
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Normalization Contract Split 2026-06-10]]"
  - "[[Backend Worklog Public Detail Contract Split 2026-06-10]]"
  - "[[Backend Worklog Public Detail Privacy Test Split 2026-06-10]]"
---
# Backend Worklog Card Builder Contract Split 2026-06-10

> [!success] Result
> The direct `build_worklog_cards` relationship hydration contract now lives in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_worklog_card_builder_contracts.py` in the backend repo.
- Moved `test_worklog_card_hydration_batches_public_card_relationships` out of `tests/test_contracts.py` without changing runtime code.
- Preserved coverage that public worklog cards hydrate in fixed batch query groups:
  - author and project payloads are attached,
  - social counts and viewer state are preserved,
  - metric privacy settings still hide disallowed fields,
  - scalar fallback queries are not used.
- Avoided growing `tests/test_worklog_card_hydration_contracts.py` because it is already `210` pure LOC and would approach the 250 LOC review ceiling.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `959` pure LOC after split.
  - `tests/test_worklog_card_builder_contracts.py`: `137` pure LOC.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_worklog_card_hydration_batches_public_card_relationships -q` → `1 passed in 0.39s`.
- Focused split file: `uv run pytest tests/test_worklog_card_builder_contracts.py -q` → `1 passed in 0.23s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_github_ci_environment_instantiates_backend_settings -q` → `1 passed in 0.34s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_worklog_card_builder_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 2.19s`.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.

## Follow-ups

- Continue splitting `tests/test_contracts.py` by cohesive surfaces until it is no longer a catch-all file.
- Next likely candidates still visible in the catch-all file: GitHub CI workflow checks, audit event contracts, and ingestion schema/source contracts.
