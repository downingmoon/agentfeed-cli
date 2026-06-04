---
title: Backend Public Project Stats Aggregation
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - performance
  - privacy
status: verified
related:
  - "[[Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04]]"
  - "[[Commercial Readiness Hardening - Backend User Public Stats Aggregation 2026-06-04]]"
  - "[[Privacy Safety]]"
---

# Backend Public Project Stats Aggregation

> [!success] Verified
> Public project stats now use aggregate SQL for both project detail and project list hydration while preserving author metric privacy.

## Why

The private/project-owner stats path was already SQL-aggregated, but the public project stats path still hydrated public worklog metric rows and folded them in Python. That left public project detail/list pages with avoidable row-load cost.

## Change

- Replaced public project row hydration with `_public_project_stats_query`.
- Kept `public_worklog_filters()` and active author filtering in the SQL path.
- Preserved privacy semantics:
  - if any contributing author hides token/file/line/test metrics, the corresponding public total returns `null`.
  - line privacy hides both `total_lines_added` and `total_lines_removed`.
  - `total_commits`, `contributor_count`, and `agents_used` remain public aggregate metadata.
- Added grouped aggregate coverage for `get_project_stats_by_project_ids(..., public_only=True)`.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
source .venv/bin/activate
ruff check .
pytest -q
```

Result:

- `ruff check .` passed.
- `pytest -q` passed: `385 passed, 1 warning`.

## Notes

> [!info]
> This pairs with [[Commercial Readiness Hardening - Backend User Public Stats Aggregation 2026-06-04]] so public profile and public project metric surfaces now share the same aggregate-first posture.

> [!warning] Still outside this change
> Hosted production validation is still blocked by `api.agentfeed.dev` DNS and stale root deployment behavior. Local/API CI is green, but live E2E still needs infrastructure repair.
