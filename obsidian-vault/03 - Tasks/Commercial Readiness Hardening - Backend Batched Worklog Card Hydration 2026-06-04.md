---
title: Commercial Readiness Hardening - Backend Batched Worklog Card Hydration 2026-06-04
aliases:
  - Backend Batched Worklog Card Hydration
  - Feed Search N+1 Removal
status: done
created: 2026-06-04
tags:
  - agentfeed/backend
  - agentfeed/performance
  - agentfeed/feed
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Backend Batched Worklog Card Hydration 2026-06-04

## 결과

> [!success]
> Backend public feed/following feed/search worklog card hydration이 카드 수만큼 author/project/social/viewer/comment permission을 반복 조회하던 N+1 surface에서 벗어나, page size와 무관한 relationship-type batch query 경로를 사용합니다.

## 문제

- `feed`와 `search`는 상용 서비스에서 가장 빈번히 호출될 읽기 경로입니다.
- 기존 `_build_feed_items()`와 search worklog result assembly는 카드마다 다음 조회를 반복했습니다.
  - author
  - project metadata
  - like/bookmark/comment counts
  - viewer liked/bookmarked state
  - following_author state
  - comment permission
  - metric privacy
- limit 100 페이지에서 DB 왕복이 카드 수에 비례해 증가할 수 있었습니다.

## 구현

- `agentfeed-backend/app/services/worklog.py`
  - `build_worklog_cards()` 추가.
  - authors, projects, social counts, viewer like/bookmark state, following state, comment permission, metric privacy를 batch hydration.
  - missing/soft-deleted authors는 card에서 제외하고, missing/deleted project는 `project: null` 유지.
- `agentfeed-backend/app/routers/feed.py`
  - `_build_feed_items()`가 공통 batch helper를 사용.
- `agentfeed-backend/app/routers/search.py`
  - worklog search result가 공통 batch helper를 사용.
  - prompt search author lookup도 per-prompt 조회 대신 author batch map으로 변경.
- `agentfeed-backend/tests/test_contracts.py`
  - 두 카드 hydration이 고정된 batch query 수로 동작하는 회귀 테스트 추가.
  - 기존 feed/search card contract fixture를 batch query 순서에 맞게 갱신.

## 검증

> [!example] Targeted
> `ruff check app/services/worklog.py app/routers/feed.py app/routers/search.py tests/test_contracts.py` → passed
>
> `pytest tests/test_contracts.py -k "worklog_card_hydration_batches_public_card_relationships or search_worklogs_respects_author_search_indexing_setting or search_prompts_respects_author_search_indexing_setting or feed_aggregate_sort_cursor_is_stable_after_prior_page_mutations or public_feed_surfaces_filter_soft_deleted_authors"` → 5 passed
>
> `pytest tests/test_contracts.py -k "search_worklog_result_uses_frontend_card_contract or feed_cards_propagate_comment_capability_for_authenticated_viewers or feed_items_omit_soft_deleted_project_metadata or worklog_card_hydration_batches_public_card_relationships"` → 4 passed

> [!success] Full backend
> `ruff check .` → passed
>
> `pytest` → 377 passed, 1 warning

## 남은 리스크

> [!warning]
> 이번 slice는 feed/search worklog card hydration의 N+1 제거입니다. Project list/stat aggregation, notification actor hydration 같은 다른 read-path batching 후보는 별도 후속 slice로 남아 있습니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Backend OAuth Provider Payload Validation 2026-06-04]]
