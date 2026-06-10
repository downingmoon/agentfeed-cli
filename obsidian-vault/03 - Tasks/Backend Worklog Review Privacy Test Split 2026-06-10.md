---
title: Backend Worklog Review Privacy Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - review
  - privacy
  - frontend-contract
  - refactor
status: done
related:
  - "[[Backend Worklog Response Model Test Split 2026-06-10]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
  - "[[Worklog Review Response Guard 2026-06-08]]"
---
# Backend Worklog Review Privacy Test Split 2026-06-10

> [!success] Result
> Worklog review privacy behavior tests now live in a focused backend contract file, separating review-page privacy rules from the oversized legacy contract module.

## What changed

- Added `tests/test_worklog_review_privacy_contracts.py`.
- Moved 4 review privacy tests out of `tests/test_contracts.py`:
  - `test_worklog_review_keeps_user_note_private_and_excludes_it_from_public_preview`
  - `test_worklog_review_marks_unknown_privacy_severity_as_danger`
  - `test_worklog_review_runs_server_privacy_scan_and_persists_blocking_findings`
  - `test_worklog_review_prefers_fresh_privacy_rows_over_stale_scan_json`
- Preserved coverage for owner-only `user_note`, preview public/private field separation, safe preview status, server-side privacy fallback scan persistence, and fresh `PrivacyFinding` rows taking precedence over stale scan JSON.
- Kept the new file below the review ceiling: `188` pure LOC by blank/comment-stripped count.
- Size movement by `wc -l`:
  - `tests/test_contracts.py`: `8,649` lines after split.
  - `tests/test_worklog_review_privacy_contracts.py`: `210` lines.

## Verification evidence

- Pre-split target selection: `uv run --locked --group dev pytest tests/test_contracts.py -k 'worklog_review_keeps_user_note_private_and_excludes_it_from_public_preview or worklog_review_marks_unknown_privacy_severity_as_danger or worklog_review_runs_server_privacy_scan_and_persists_blocking_findings or worklog_review_prefers_fresh_privacy_rows_over_stale_scan_json'` → `4 passed, 286 deselected in 0.50s`.
- Focused split file: `uv run --locked --group dev pytest tests/test_worklog_review_privacy_contracts.py` → `4 passed in 0.39s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_review_privacy_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run --locked --group dev pytest` → `428 passed, 1 warning in 2.09s`.
- Cross-repo OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with `75` operations, `70` client contracts, and `347` strict client JSON error response checks.
- Cross-repo full gate: `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh` completed successfully, including CLI release preflight, frontend CI/build/audit, backend suite, and alembic offline migration chain.

## Not done

- No runtime behavior changed.
- No schema/API contract changed.
- No server deployment was performed for this pass.

## Follow-ups

- Split publish privacy gate tests into a focused backend contract file.
- Split server publish privacy scanner tests into a focused backend contract file.
- Split worklog card hydration/list-query batching tests into focused service contract files.
- Continue reducing `tests/test_contracts.py` by cohesive frontend/API contract surfaces.
