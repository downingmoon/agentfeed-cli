---
title: Commercial Readiness Hardening - Backend Me Card Hydration Batching 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/performance
  - hardening
status: completed
created: 2026-06-04
aliases:
  - Backend me card hydration batching
---

# Commercial Readiness Hardening - Backend Me Card Hydration Batching 2026-06-04

## 목적

`/v1/me/worklogs`와 `/v1/me/bookmarks`는 사용자 대시보드/북마크 화면의 핵심 API다. 기존 구현은 페이지 row마다 author/project/social/viewer state를 개별 조회하는 구조라, 상용 트래픽과 큰 페이지 크기에서 N+1 쿼리 리스크가 남아 있었다.

> [!important]
> 공개 feed/search는 이미 `build_worklog_cards()` 배치 hydration을 사용한다. `/me` 계열도 같은 helper로 통일해야 카드 contract와 성능 특성이 일관된다.

## 변경 요약

- `agentfeed-backend/app/routers/me.py`
  - `/me/worklogs`를 `build_worklog_cards(page, db, current_user)`로 전환.
  - `/me/bookmarks`도 bookmark row에서 worklog 목록만 추출해 같은 배치 helper로 전환.
  - per-card `get_social_counts`, author query, project query, viewer state scalar query 호출을 제거했다.
- `agentfeed-backend/tests/test_contracts.py`
  - owner dashboard worklog cards가 고정 쿼리 수로 hydration되는지 검증.
  - bookmarks viewer state(`bookmarked`, `following_author`)가 배치 helper 전환 후에도 유지되는지 검증.

## 검증

> [!success] Fresh local verification
> - `uv run ruff check app/routers/me.py tests/test_contracts.py` ✅
> - `uv run pytest -q tests/test_contracts.py -k 'my_worklogs_batches_card_hydration_for_owner_dashboard or my_bookmarks_propagates_following_author_viewer_state or keyset_list_endpoints_ignore_malformed_cursors_instead_of_500s'` ✅ — 3 tests
> - `uv run ruff check .` ✅
> - `uv run pytest -q` ✅ — 386 tests, 1 warning

## 남은 외부 차단 조건

- 이 변경은 backend local/API 성능 hardening이다.
- hosted full E2E는 여전히 `api.agentfeed.dev` DNS와 `agentfeed.dev` stale redirect가 해결되어야 검증 가능하다.

## 관련 노트

- [[Commercial Readiness Hardening - Backend Batched Worklog Card Hydration 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Dashboard Metric Aggregation 2026-06-04]]
- [[Commercial Readiness Hardening - Backend Project Owner Stats Aggregation 2026-06-04]]
- [[Active Tasks]]
