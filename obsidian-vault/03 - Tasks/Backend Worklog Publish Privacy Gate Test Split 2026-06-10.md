---
title: Backend Worklog Publish Privacy Gate Test Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - tests
  - api-contract
  - worklog
  - publish
  - privacy
  - frontend-contract
  - refactor
status: done
related:
  - "[[Backend Worklog Review Privacy Test Split 2026-06-10]]"
  - "[[Backend Worklog Response Model Test Split 2026-06-10]]"
  - "[[Worklog Review Strict Response Boundary 2026-06-09]]"
---
# Backend Worklog Publish Privacy Gate Test Split 2026-06-10

> [!success] Result
> Worklog publish privacy-gate behavior tests now live in a focused backend contract file, separating publish-blocking rules from the oversized legacy contract module.

## What changed

- Added `tests/test_worklog_publish_privacy_gate_contracts.py`.
- Moved 3 publish privacy gate tests out of `tests/test_contracts.py`:
  - `test_blocking_privacy_finding_cannot_be_resolved_as_ignored`
  - `test_previously_ignored_blocking_privacy_finding_still_blocks_publish`
  - `test_resolved_server_publish_finding_is_rechecked_before_publish`
- Removed duplicate standalone async markers that were left near the publish privacy section after prior test splits.
- Preserved coverage for blocking privacy findings, disallowing `ignored` resolution for publish-blocking findings, and rechecking resolved/redacted findings before publication.
- Kept the new file below the review ceiling: `98` pure LOC by blank/comment-stripped count.
- Size movement by `wc -l`:
  - `tests/test_contracts.py`: `8,525` lines after split.
  - `tests/test_worklog_publish_privacy_gate_contracts.py`: `117` lines.

## Verification evidence

- Pre-split target selection: `uv run --locked --group dev pytest tests/test_contracts.py -k 'blocking_privacy_finding_cannot_be_resolved_as_ignored or previously_ignored_blocking_privacy_finding_still_blocks_publish or resolved_server_publish_finding_is_rechecked_before_publish'` → `3 passed, 283 deselected in 0.46s`.
- Focused split file: `uv run --locked --group dev pytest tests/test_worklog_publish_privacy_gate_contracts.py` → `3 passed in 0.44s`.
- Backend lint: `uv run --locked --group dev ruff check tests/test_contracts.py tests/test_worklog_publish_privacy_gate_contracts.py` → `All checks passed!`.
- Backend full suite: `uv run --locked --group dev pytest` → `428 passed, 1 warning in 2.40s`.
- Cross-repo OpenAPI contract gate: `AgentFeed OpenAPI contract gate passed` with `75` operations, `70` client contracts, and `347` strict client JSON error response checks.
- Cross-repo full gate: `cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs && bash scripts/test-all.sh` completed successfully, including CLI release preflight, frontend CI/build/audit, backend suite, and alembic offline migration chain.

## Not done

- No runtime behavior changed.
- No schema/API contract changed.
- No server deployment was performed for this pass.

## Follow-ups

- Split server publish privacy scanner tests into a focused backend contract file.
- Split public worklog detail sanitization tests into a focused backend contract file.
- Split worklog card hydration/list-query batching tests into focused service contract files.
- Continue reducing `tests/test_contracts.py` by cohesive frontend/API contract surfaces.
