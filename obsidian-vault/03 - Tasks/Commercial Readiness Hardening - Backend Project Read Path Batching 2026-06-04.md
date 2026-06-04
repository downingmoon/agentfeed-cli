---
title: Commercial Readiness Hardening - Backend Project Read Path Batching 2026-06-04
aliases:
  - Backend Project Read Path Batching
  - Project List Stats N+1 Removal
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/projects
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Project Read Path Batching 2026-06-04

## 결과

> [!success]
> Backend project list가 프로젝트마다 stats를 따로 조회하던 N+1 경로에서 벗어나, public/owner visibility policy별 batch stats query를 사용합니다. Project detail의 worklog list도 공통 batched WorklogCard hydrator를 사용합니다.

## 문제

- `GET /v1/projects`는 최대 100개 프로젝트를 반환할 수 있는데, 기존 구현은 각 project마다 `get_project_stats()`를 호출했습니다.
- `GET /v1/projects/{id}/worklogs`는 feed/search에서 제거한 card hydration N+1 패턴을 여전히 유지하고 있었습니다.
- 상용 트래픽에서 project listing/detail 화면은 feed 다음으로 반복 접근될 수 있으므로, page size에 비례하는 DB round trip은 줄여야 합니다.

## 구현

- `agentfeed-backend/app/services/project.py`
  - `get_project_stats_by_project_ids()` 추가.
  - project id 집합을 한 번에 받아 stats row를 project별로 그룹화.
  - public-only stats는 기존 metric privacy 계산을 유지.
  - owner-visible stats는 private/unlisted 포함 기존 동작 유지.
- `agentfeed-backend/app/routers/projects.py`
  - `list_projects()`가 public/owner project id를 나눠 batch stats 조회.
  - `get_project_worklogs()`가 `build_worklog_cards()` 공통 batch hydrator를 사용.
- `agentfeed-backend/tests/test_contracts.py`
  - project list가 여러 project stats를 고정 query로 batch 조회하는 계약 추가.
  - project worklogs가 batched WorklogCard hydrator를 사용하는 계약 추가.

## 검증

> [!example] Targeted
> `ruff check app/services/project.py app/routers/projects.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "project_list_batches_stats_for_multiple_projects or project_worklogs_use_batched_card_hydration or public_project_stats_exclude_unpublished_worklogs or public_project_stats_respect_author_metric_privacy or project_worklog_public_list_requires_published_status or project_public_surfaces_filter_soft_deleted_owners_and_authors"` → 6 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 379 passed, 1 warning

## 남은 리스크

> [!warning]
> 이번 slice는 project read-path batching입니다. Notifications actor hydration, dashboard summary count consolidation 같은 다른 read-path hardening 후보는 별도 후속 작업으로 남아 있습니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend Batched Worklog Card Hydration 2026-06-04]]
