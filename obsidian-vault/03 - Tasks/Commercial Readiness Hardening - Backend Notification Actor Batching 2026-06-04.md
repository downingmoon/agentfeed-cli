---
title: Commercial Readiness Hardening - Backend Notification Actor Batching 2026-06-04
aliases:
  - Backend Notification Actor Batching
  - Notification Actor N+1 Removal
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/notifications
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Notification Actor Batching 2026-06-04

## 결과

> [!success]
> `GET /v1/me/notifications`가 알림마다 actor user를 개별 조회하던 N+1 경로에서 벗어나, page actor ids를 한 번에 조회하는 batch hydration을 사용합니다.

## 문제

- 로그인 사용자의 notification page는 상용 서비스에서 반복 접근되는 authenticated read-path입니다.
- 기존 구현은 notification page를 가져온 뒤 각 notification의 `actor_id`마다 `users`를 별도 조회했습니다.
- 알림이 많은 사용자에서 DB round trip이 page size에 비례해 증가할 수 있었습니다.

## 구현

- `agentfeed-backend/app/routers/notifications.py`
  - page의 `actor_id` 집합을 먼저 수집.
  - `select(User).where(User.id.in_(actor_ids), User.deleted_at.is_(None))`로 actor를 batch 조회.
  - soft-deleted actor는 기존처럼 `actor: null`로 유지.
  - payload/target/read/cursor response contract는 유지.
- `agentfeed-backend/tests/test_contracts.py`
  - 두 actor 알림이 notification query + actor batch query, 총 2개 query로 hydrate되는 계약 추가.
  - soft-deleted actor suppression fixture를 batch query 결과 형태에 맞게 갱신.

## 검증

> [!example] Targeted
> `ruff check app/routers/notifications.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "notifications_batch_actor_hydration_for_page or notifications_suppress_soft_deleted_actors or keyset_list_endpoints_ignore_malformed_cursors_instead_of_500s or notification_read_mutations_are_user_scoped_and_idempotent"` → 4 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 380 passed, 1 warning

## 남은 리스크

> [!warning]
> 이번 slice는 notification read-path actor batching입니다. Dashboard summary count consolidation, create-notification settings lookup batching 같은 후보는 후속 작업으로 남아 있습니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Project Read Path Batching 2026-06-04]]
