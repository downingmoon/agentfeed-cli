---
title: Backend Worklog Server Privacy Scanner Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - publish
  - privacy
  - scanner
  - refactor
status: done
related:
  - "[[Backend Worklog Publish Privacy Gate Test Split 2026-06-10]]"
  - "[[Backend Worklog Review Privacy Test Split 2026-06-10]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---
# Backend Worklog Server Privacy Scanner Test Split 2026-06-10

> [!success] Result
> Server-side publish privacy scanner tests now live in a focused backend contract file, making sensitive-field blocking behavior easier to audit before public worklogs are exposed.

## What changed

- Added `tests/test_worklog_server_privacy_scanner_contracts.py`.
- Moved 2 scanner tests out of `tests/test_contracts.py`:
  - `test_server_publish_privacy_scan_blocks_common_sensitive_public_fields`
  - `test_server_publish_privacy_scan_blocks_direct_provider_tokens`
- Preserved coverage for email/path/localhost/config-file style leaks and direct provider token patterns across public worklog fields.
- Kept the new file below the review ceiling: `42` pure LOC by blank/comment-stripped count.
- Size movement by `wc -l`:
  - `tests/test_contracts.py`: `8,477` lines after split.
  - `tests/test_worklog_server_privacy_scanner_contracts.py`: `53` lines.

## Verification evidence

- Pre-split target selection: `uv run --locked --group dev pytest tests/test_contracts.py -k 'server_publish_privacy_scan_blocks_common_sensitive_public_fields or server_publish_privacy_scan_blocks_direct_provider_tokens'` → `2 passed, 281 deselected in 0.72s`.
- Focused split file: `uv run --locked --group dev pytest tests/test_worklog_server_privacy_scanner_contracts.py` → `2 passed in 0.46s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_server_privacy_scanner_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run --locked --group dev pytest` → `428 passed, 1 warning in 2.29s`.
- Cross-repo OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with `75` operations, `70` client contracts, and `347` strict client JSON error response checks.
- Cross-repo full gate: `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh` completed successfully, including CLI release preflight, frontend CI/build/audit, backend suite, and alembic offline migration chain.

## Not done

- No runtime behavior changed.
- No schema/API contract changed.
- No server deployment was performed for this pass.

## Follow-ups

- Split public worklog detail sanitization tests into a focused backend contract file.
- Split worklog card hydration/list-query batching tests into focused service contract files.
- Continue reducing `tests/test_contracts.py` by cohesive frontend/API contract surfaces.
