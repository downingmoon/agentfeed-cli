---
title: Commercial Readiness Hardening - Backend Dashboard Metric Aggregation 2026-06-04
aliases:
  - Backend Dashboard Metric Aggregation
  - Dashboard Summary DB Metrics
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/dashboard
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Dashboard Metric Aggregation 2026-06-04

## 결과

> [!success]
> `GET /v1/me/dashboard/summary`가 today/week dashboard metrics를 Python application layer에서 row-by-row 합산하지 않고, DB aggregate query로 계산합니다.

## 문제

- Dashboard summary는 로그인 직후 반복 호출되는 core authenticated read-path입니다.
- 이전 slice에서 status count는 단일 `GROUP BY worklogs.status`로 줄였지만, today/week metric은 여전히 week window의 `metrics_json` rows를 가져와 Python에서 합산했습니다.
- 상용 traffic에서는 worklog 수가 많은 사용자일수록 network payload와 application CPU가 증가합니다.

## 구현

- `agentfeed-backend/app/routers/me.py`
  - week window 기준 aggregate query 1개로 다음 값을 계산:
    - `sessions_today`, `sessions_week`
    - `tokens_used_today`, `tokens_used_week`
    - `files_changed_today`, `files_changed_week`
    - `tests_run_today`, `tests_run_week`
    - `published_worklogs_today`, `published_worklogs_week`
  - JSONB metrics는 `Worklog.metrics_json[field].as_integer()` + `COALESCE`로 DB에서 합산.
  - status count aggregate와 합쳐 dashboard summary read-path를 총 2 query로 유지.
- `agentfeed-backend/tests/test_contracts.py`
  - dashboard summary contract가 metric aggregate query + status aggregate query, 총 2개 statement를 사용하는지 검증.
  - 기존 response shape 유지 검증.

## 검증

> [!example] Targeted
> `ruff check app/routers/me.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "dashboard_summary_batches_status_counts or dashboard_recent_worklogs_return_status_aware_action_urls"` → 2 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 381 passed, 1 warning

## Hosted smoke 재확인

> [!warning]
> 2026-06-04 smoke 기준 `api.agentfeed.dev`는 DNS resolve가 되지 않고, `https://agentfeed.dev/` root는 아직 `/login` stale redirect를 반환합니다. 이번 slice는 deploy/DNS blocker가 아니라 backend local code hardening입니다.

## 남은 리스크

- Production dashboard latency는 hosted API DNS/deploy가 준비된 뒤 실제 계정/데이터로 다시 측정해야 합니다.
- Project stats read-path에도 JSONB row 합산 경로가 남아 있으므로, dashboard와 같은 aggregate 기준으로 후속 hardening 후보입니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Dashboard Summary Count Consolidation 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Project Read Path Batching 2026-06-04]]
