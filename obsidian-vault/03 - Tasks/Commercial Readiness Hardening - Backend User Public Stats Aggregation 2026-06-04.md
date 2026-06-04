---
title: Backend User Public Stats Aggregation
date: 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - performance
  - privacy
status: verified
related:
  - "[[Commercial Readiness Audit 2026-05-30]]"
  - "[[Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Backend User Public Stats Aggregation

> [!success] Verified
> `app/services/user.py` now builds public profile stats from a single aggregate read instead of multiple scalar reads plus hydrated metric rows.

## Why

Public user profiles are a high-frequency frontend surface. Before this pass, `get_user_public_stats` calculated:

- public worklog count
- public project count
- public metric totals
- published days for streaks
- followers / following counts

with several independent DB calls and full public worklog metric hydration.

## Change

- Added SQL aggregate helpers for public metric totals.
- Preserved DB/user-settings privacy semantics:
  - `show_token_usage_publicly = false` -> `total_tokens_public = null`
  - `show_file_count_publicly = false` -> `total_files_changed_public = null`
  - `show_line_count_publicly = false` -> `total_lines_added_public = null`
  - `show_test_count_publicly = false` -> `total_tests_run_public = null`
- Kept missing settings as default-public for token/file/line/test metrics.
- Collapsed public project count and follow counts into scalar subqueries on the same stats query.
- Kept current streak calculation in Python from aggregated `published_days`.

## Verification

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
source .venv/bin/activate
ruff check .
pytest -q
```

Result:

- `ruff check .` passed.
- `pytest -q` passed: `384 passed, 1 warning`.

## Follow-ups

> [!warning] Hosted blocker remains
> This local/backend hardening is verified, but hosted production E2E remains blocked until `api.agentfeed.dev` DNS and the stale `agentfeed.dev` root deployment are fixed.

Potential next P1 surfaces:

- [[Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04|public project stats privacy path]] can still be assessed for aggregate conversion if we decide to optimize public project detail/profile pages further.
- Frontend page-level null-safety can be sampled again after this backend path lands.
