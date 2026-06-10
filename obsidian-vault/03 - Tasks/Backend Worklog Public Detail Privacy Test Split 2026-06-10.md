---
title: Backend Worklog Public Detail Privacy Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - public-detail
  - privacy
  - frontend-contract
  - refactor
status: done
related:
  - "[[Backend Worklog Server Privacy Scanner Test Split 2026-06-10]]"
  - "[[Backend Worklog Publish Privacy Gate Test Split 2026-06-10]]"
  - "[[Worklog Detail Response Guard 2026-06-08]]"
---
# Backend Worklog Public Detail Privacy Test Split 2026-06-10

> [!success] Result
> Public worklog detail privacy sanitization now lives in a focused backend contract file, making owner-only notes, raw source identifiers, and raw scan findings easier to audit.

## What changed

- Added `tests/test_worklog_public_detail_privacy_contracts.py`.
- Moved `test_public_worklog_detail_sanitizes_source_and_privacy_scan_findings` out of `tests/test_contracts.py`.
- Preserved coverage for public detail response sanitization:
  - owner-only `user_note` is not returned to anonymous public viewers,
  - public `source` keeps only allowed fields,
  - raw host/session/draft/fingerprint/window identifiers do not leak,
  - raw privacy scan findings are hidden from the public response.
- Kept the new file below the review ceiling: `79` pure LOC by blank/comment-stripped count.
- Size movement by `wc -l`:
  - `tests/test_contracts.py`: `8,396` lines after split.
  - `tests/test_worklog_public_detail_privacy_contracts.py`: `86` lines.

## Verification evidence

- Pre-split target selection: `uv run --locked --group dev pytest tests/test_contracts.py -k 'public_worklog_detail_sanitizes_source_and_privacy_scan_findings'` → `1 passed, 280 deselected in 0.47s`.
- Focused split file: `uv run --locked --group dev pytest tests/test_worklog_public_detail_privacy_contracts.py` → `1 passed in 0.57s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_public_detail_privacy_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run --locked --group dev pytest` → `428 passed, 1 warning in 3.12s`.
- Cross-repo OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with `75` operations, `70` client contracts, and `347` strict client JSON error response checks.
- Cross-repo full gate: `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh` completed successfully, including CLI release preflight, frontend CI/build/audit, backend suite, and alembic offline migration chain.

## Not done

- No runtime behavior changed.
- No schema/API contract changed.
- No server deployment was performed for this pass.

## Follow-ups

- Split worklog card hydration/list-query batching tests into focused service contract files.
- Split search/tags privacy filtering tests into focused discovery/search contract files.
- Continue reducing `tests/test_contracts.py` by cohesive frontend/API contract surfaces.
