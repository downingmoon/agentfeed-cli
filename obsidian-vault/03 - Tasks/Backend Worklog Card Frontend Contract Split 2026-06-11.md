---
title: Backend Worklog Card Frontend Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - frontend-contract
  - worklog
  - card
  - privacy
  - maintainability
  - refactor
status: done
related:
  - "[[Backend Worklog Schema Contract Split 2026-06-10]]"
  - "[[Backend Ingestion Payload Contract Split 2026-06-10]]"
  - "[[Backend Worklog Card Builder Contract Split 2026-06-10]]"
---
# Backend Worklog Card Frontend Contract Split 2026-06-11

> [!success] Result
> Frontend-facing WorklogCard shape, metric privacy, and active-project lookup contracts now live in a focused backend test file instead of the catch-all contract suite.

## What changed

- Added `tests/test_worklog_card_frontend_contracts.py` in the backend repo.
- Moved these contracts out of `tests/test_contracts.py` without runtime changes:
  - `test_worklog_card_includes_frontend_contract_fields`
  - `test_worklog_card_respects_metric_privacy_flags_for_public_viewer`
  - `test_worklog_card_omits_soft_deleted_project_payload`
  - `test_worklog_card_project_lookup_requires_active_project`
- Preserved frontend/API guarantees:
  - public cards expose the stable fields the frontend consumes,
  - private owner notes and raw collection/source identifiers stay hidden,
  - metric privacy settings hide public viewer metrics while preserving author visibility,
  - soft-deleted project metadata does not leak into public cards,
  - card project lookup filters out deleted projects.
- Kept the existing card builder/hydration/public-detail files untouched because they already own adjacent responsibilities and two are near the 250 pure-LOC ceiling.
- Skipped GitHub CI workflow tests because active goal rule says server/infra/CICD work is currently on hold.
- Size movement by blank/comment-stripped count:
  - `tests/test_contracts.py`: `403` pure LOC after split.
  - `tests/test_worklog_card_frontend_contracts.py`: `228` pure LOC.

> [!warning] File size note
> `tests/test_worklog_card_frontend_contracts.py` is in the 200-250 pure-LOC warning band. Do not add more cases to it without splitting by responsibility, likely into frontend-shape, metric-privacy, and project-lookup files.

## Verification evidence

- Pre-split baseline: `uv run pytest tests/test_contracts.py::test_worklog_card_includes_frontend_contract_fields tests/test_contracts.py::test_worklog_card_respects_metric_privacy_flags_for_public_viewer tests/test_contracts.py::test_worklog_card_omits_soft_deleted_project_payload tests/test_contracts.py::test_worklog_card_project_lookup_requires_active_project -q` → `4 passed in 0.50s`.
- Focused split file: `uv run pytest tests/test_worklog_card_frontend_contracts.py -q` → `4 passed in 0.58s`.
- Adjacent catch-all smoke: `uv run pytest tests/test_contracts.py::test_github_access_token_exchange_rejects_missing_access_token -q` → `1 passed in 0.62s`.
- Backend lint: `uv run ruff check tests/test_contracts.py tests/test_worklog_card_frontend_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run pytest -q` → `439 passed, 1 warning in 2.57s`.
- Escape-hatch scan on changed files found no `type: ignore`, `pyright: ignore`, broad `except Exception`, silent `except`, `cast(`, or `Any` additions.
- LSP diagnostics: unavailable because `basedpyright-langserver` is not installed in the current environment.

## Not done

- No backend runtime behavior changed.
- No API/schema contract changed.
- No server deployment was performed; deployment remains intentionally out of scope for the active goal.
- CI workflow contract tests remain in `tests/test_contracts.py` because CI/infra work is explicitly paused.

## Follow-ups

- Continue reducing `tests/test_contracts.py` by non-infra cohesive surfaces.
- Split `tests/test_worklog_card_frontend_contracts.py` before adding future cases because it is already in the warning band.
- Next likely catch-all candidates: GitHub OAuth HTTP boundary tests, user activity/streak contracts, and user-generated text limits.
