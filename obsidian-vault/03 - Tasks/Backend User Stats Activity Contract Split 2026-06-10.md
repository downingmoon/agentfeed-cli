---
title: Backend User Stats Activity Contract Split 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - backend
  - contract-tests
  - user-stats
  - user-activity
status: done
---

# Backend User Stats Activity Contract Split 2026-06-10

> [!success] Result
> `tests/test_contracts.py`에 남아 있던 user public stats 및 user activity/date-range 계약 테스트 9개를 `tests/test_user_public_stats_contracts.py`와 `tests/test_user_activity_contracts.py`로 분리했다.

## Why

- User profile viewer-state 계약은 이미 분리됐지만, public stats/activity timeline 계약은 여전히 catch-all 파일에 남아 있었다.
- 공개 사용자 통계 privacy redaction, activity date range parsing, JSON metric bigint cast, public activity token redaction은 공개 프로필/통계 화면의 핵심 contract다.
- 새 파일을 81/143 LOC로 유지해 이후 user/leaderboard 계약 분리를 이어가기 쉽게 했다.

## Changed

Moved from `agentfeed-backend/tests/test_contracts.py` to:

- `tests/test_user_public_stats_contracts.py`
  - `test_user_public_stats_respect_metric_privacy_settings`
  - `test_user_public_stats_aggregate_visible_metrics_and_streaks`
- `tests/test_user_activity_contracts.py`
  - `test_user_activity_date_range_parses_date_only_bounds_as_utc_calendar_days`
  - `test_user_activity_date_range_preserves_full_datetime_to_as_exact_exclusive_instant`
  - `test_user_activity_date_range_normalizes_aware_datetimes_to_utc`
  - `test_user_activity_date_range_rejects_more_than_180_days`
  - `test_worklog_metric_queries_cast_json_metrics_to_bigint`
  - `test_user_activity_date_only_to_filters_through_requested_calendar_day`
  - `test_public_user_activity_tokens_respect_metric_privacy_settings`

## Verification Evidence

```text
uv run --locked --group dev ruff check tests/test_contracts.py tests/test_user_public_stats_contracts.py tests/test_user_activity_contracts.py
# All checks passed!
```

```text
uv run --locked --group dev pytest tests/test_user_public_stats_contracts.py tests/test_user_activity_contracts.py
# 9 passed in 0.36s
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning in 1.59s
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
```

```text
bash scripts/test-all.sh
# CLI: 591 passed; typecheck; release preflight; audit 0 vulnerabilities
# Frontend: typecheck; mock API compatibility; production build; audit 0 vulnerabilities
# Backend: ruff; 428 passed; alembic offline migration chain captured
```

## Deployment Note

> [!info]
> 이 작업 자체는 enterprise-readiness pass의 계약 테스트 정리였지만, 이후 사용자가 명시적으로 개인서버 배포를 요청하여 별도 배포 작업을 진행했다.

## Follow-up

- [ ] Split leaderboard contracts next, including `test_tests_leaderboard_filters_private_test_counts`.
- [ ] Continue worklog publish/privacy contract decomposition.
- [ ] Keep future user stats privacy aggregate tests in `test_user_public_stats_contracts.py`.
- [ ] Keep future user activity/date-range tests in `test_user_activity_contracts.py`.
