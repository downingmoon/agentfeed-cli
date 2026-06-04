---
title: Commercial Readiness Hardening - Backend Dashboard Summary Count Consolidation 2026-06-04
aliases:
  - Backend Dashboard Summary Count Consolidation
  - Dashboard Status Count Batching
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/dashboard
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Dashboard Summary Count Consolidation 2026-06-04

## 결과

> [!success]
> `GET /v1/me/dashboard/summary`가 draft/needs_review/private/public status count를 각각 scalar query로 조회하던 경로에서 벗어나, 단일 `GROUP BY worklogs.status` aggregate query로 count를 조회합니다.

## 문제

- Dashboard summary는 로그인 직후 자주 호출되는 core authenticated read-path입니다.
- 기존 구현은 today/week metric query 2개에 더해 status count 4개를 각각 별도 query로 실행했습니다.
- 상태 count는 같은 필터의 status별 집계이므로 한 번의 aggregate query로 충분합니다.

## 구현

- `agentfeed-backend/app/routers/me.py`
  - `draft`, `needs_review`, `private`, `public` count를 `Worklog.status.in_(...)` + `GROUP BY Worklog.status`로 통합.
  - 기존 response keys 유지:
    - `drafts_count`
    - `needs_review_count`
    - `private_worklogs_count`
    - `public_worklogs_count`
- `agentfeed-backend/tests/test_contracts.py`
  - dashboard summary가 today/week metric query 2개 + status aggregate query 1개, 총 3개 query로 동작하는 계약 추가.

## 검증

> [!example] Targeted
> `ruff check app/routers/me.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "dashboard_summary_batches_status_counts or dashboard_recent_worklogs_return_status_aware_action_urls"` → 2 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 381 passed, 1 warning

## 남은 리스크

> [!warning]
> 이번 slice는 dashboard summary status count consolidation입니다. Today/week metric rows는 아직 JSONB metrics를 application layer에서 합산하므로, 필요 시 후속으로 DB-level metric aggregation을 검토할 수 있습니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Notification Actor Batching 2026-06-04]]
