---
title: Backend Public Username Discovery Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/backend
  - agentfeed/frontend
  - contracts
  - profile
  - discovery
  - completed
status: completed
---

# Backend Public Username Discovery Guard 2026-06-08

## 목적

Frontend는 이미 `profileUsername`이 없는 user를 backend id 기반 `/profile/:id` 링크로 보내지 않도록 방어한다. 이번 루프에서는 Backend public discovery/follow entry surface도 같은 계약을 지키도록 맞췄다.

## 문제

> [!bug]
> `search users`, `explore rising_builders`, `leaderboard`는 public profile/follow entry로 렌더링되는 user 목록인데, query 차원에서 `users.username IS NOT NULL`을 강제하지 않았다.

이 상태에서는 username이 아직 없는 GitHub-auth user가 검색/탐색/랭킹에 나타날 수 있고, Frontend가 링크를 비활성화하더라도 API 소비자 관점에서는 non-actionable public identity row가 남는다.

## 수정

- [[agentfeed-backend]]
  - `app/routers/search.py`
    - users branch에 `User.username.isnot(None)` 추가
  - `app/routers/explore.py`
    - `rising_builders` query에 `User.username.isnot(None)` 추가
  - `app/routers/leaderboard.py`
    - 일반 leaderboard final user query에 `User.username.isnot(None)` 추가
    - secondary metric leaderboard query에도 동일 guard 추가
    - `longest_streak` streak ranking query가 `User`를 join하고 username/deleted guard를 먼저 적용하도록 수정
    - `longest_streak` user fetch에도 username guard 유지

## RED → GREEN 증거

- RED
  - `.venv/bin/pytest -q tests/test_contracts.py::test_search_and_explore_surfaces_filter_soft_deleted_authors_and_owners tests/test_contracts.py::test_leaderboard_uses_cursor_offset_and_global_rank_metadata tests/test_contracts.py::test_leaderboard_longest_streak_uses_distinct_author_days_and_batched_follows` 실패
  - 실패 원인: `users.username IS NOT NULL` 또는 `JOIN users` 없음
- GREEN
  - 동일 targeted pytest ✅
  - `.venv/bin/ruff check . && .venv/bin/pytest -q` ✅ — 398 passed, 1 warning
  - `npm run test:contracts && npm run lint` ✅
  - `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_REVIEW_BASE_URL=http://localhost:3000 npm run build` ✅

## 계약 메모

> [!info]
> Public worklog card/detail author는 content identity surface이므로 avatar/name 표시가 가능해야 한다. 반면 search users, rising builders, leaderboard는 profile/follow entry surface이므로 public `username`이 없는 user는 Backend에서 제외한다.

## 후행 과제

> [!todo]
> profile/follow entry 성격의 새 API가 추가될 때 `users.username IS NOT NULL` 계약을 backend contract test에 먼저 추가한다.

> [!todo]
> 서버/DB backfill은 현재 goal 규칙상 보류한다. 추후 배포 단계에서 username 없는 기존 user row가 실제 데이터에 남아 있는지 별도 운영 점검한다.
