---
title: Commercial Readiness Hardening - Bookmark Follow State Contract 2026-06-02
aliases:
  - Bookmark follow state contract
  - my bookmarks following_author viewer state
  - saved worklog follow-state hydration
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - agentfeed/frontend-contract
  - agentfeed/social
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - Bookmark Follow State Contract 2026-06-02

> [!success] 목표
> `/v1/me/bookmarks`가 북마크한 worklog card의 `viewer_state.following_author`를 실제 follow 상태로 반환하도록 고정해, Frontend saved/bookmarked card UX가 서버 상태와 어긋나는 false UI를 방지합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#계약 기준]]
- API drift gate: [[Commercial Readiness Hardening - OpenAPI Request Body and Schema Contract Gate 2026-06-02]]
- Frontend adapter는 `following_author`를 `followingAuthor`로 그대로 매핑합니다.

## 변경 범위

- `agentfeed-backend/app/routers/me.py`
  - `/me/bookmarks` page author ids에 대해 `Follow` rows를 배치 조회.
  - 단건 `check_following` 반복 호출 없이 같은 viewer-state 계약을 보존해 N+1 query를 피함.
  - `_build_worklog_card(... viewer_following_author=...)`에 전달.
- `agentfeed-backend/tests/test_contracts.py`
  - `test_my_bookmarks_propagates_following_author_viewer_state` 추가.
  - `bookmarked=true`와 `following_author=true`가 함께 보존되는지 검증.

## 고정된 계약

- Saved/bookmarked worklog card도 feed/profile/project card와 동일하게 viewer follow state를 유지해야 합니다.
- 본인 author worklog는 follow 대상에서 제외되어 `following_author=false`입니다.
- Frontend는 Backend 응답의 `viewer_state.following_author`를 신뢰해 `Worklog.viewerState.followingAuthor`를 hydrate할 수 있습니다.

## 검증 증거

- RED: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -k 'my_bookmarks_propagates_following_author_viewer_state'` 실패.
  - 실패 원인: `following_author`가 `False`로 반환됨.
- GREEN: 같은 targeted pytest 통과.
- GREEN: `uv run --python 3.12 --locked --group dev ruff check .`
- GREEN: `uv run --python 3.12 --locked --group dev pytest tests`
  - 284 passed, 1 warning.
- GREEN: `agentfeed-dev ./scripts/test-all.sh`
  - OpenAPI contract gate passed.
  - AgentFeed CLI: 314 tests passed, typecheck passed, release preflight passed, production dependency audit passed.
  - Frontend: production CI/build and dependency audit passed.
  - Backend: ruff passed, 284 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이 변경은 `/me/bookmarks`의 response contract를 고정합니다. 실제 browser에서 Saved/Bookmarks 탭이 follow badge 또는 builder list를 어떻게 표시하는지는 별도 visual/e2e smoke가 필요할 수 있습니다.
