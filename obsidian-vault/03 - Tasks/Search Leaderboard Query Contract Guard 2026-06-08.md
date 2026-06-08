---
title: Search Leaderboard Query Contract Guard 2026-06-08
aliases:
  - Search Leaderboard Query Contract Guard
status: completed
tags:
  - agentfeed/todo
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
created: 2026-06-08
updated: 2026-06-08
---

# Search Leaderboard Query Contract Guard 2026-06-08

## 목적

Search와 Leaderboard discovery API의 query parameter/response contract가 Backend와 Frontend 사이에서 넓은 `string`으로 다시 열리지 않도록 닫았다.

> [!success] 완료 판정
> Backend는 `Literal` 기반 query/response type으로 contract를 고정했고, Frontend는 source contract test로 같은 값 집합과 strict parser 사용을 계속 감시한다.

## 변경 내용

- Backend `app.schemas.search.SearchType` 추가.
  - 허용값: `all`, `worklogs`, `projects`, `users`, `prompts`.
- Backend `/v1/search` query `type`을 `SearchType`으로 제한.
  - 이전의 unknown `type` → `all` silent fallback을 제거했다.
  - 잘못된 query 값은 FastAPI validation 단계에서 422로 실패한다.
- Backend `app.schemas.leaderboard.LeaderboardType` / `LeaderboardPeriod` 추가.
  - `LeaderboardResponse.type` / `period`를 broad `str`에서 literal union으로 좁혔다.
  - `/v1/leaderboard` query `type` / `period`도 같은 alias를 사용한다.
  - 이전의 unknown `type` / `period` → default silent fallback을 제거했다.
- Backend regression test 추가.
  - router annotation이 schema literal alias와 일치하는지 확인.
  - `LeaderboardResponse`가 unknown type/period를 reject하는지 확인.
- Frontend source contract test 추가.
  - `LeaderboardType`, `LeaderboardPeriod`, `SearchQueryType` union 유지.
  - leaderboard strict response parser가 `LEADERBOARD_TYPES` / `LEADERBOARD_PERIODS`로 fail-closed 하는지 확인.
  - search client가 arbitrary search type string을 받지 않는지 확인.

## 검증

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_discovery_query_filter_contracts_are_literal_typed tests/test_contracts.py::test_search_query_rejects_wildcard_only_terms_and_escapes_like_patterns tests/test_contracts.py::test_leaderboard_cursor_rejects_huge_offsets`
  - `uv run ruff check app/routers/search.py app/routers/leaderboard.py app/schemas/search.py app/schemas/leaderboard.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest`: 410 passed, 1 warning
  - `uv run ruff check .`: passed
- Frontend:
  - `npm run test:contracts`: passed
  - `npm run lint`: passed
- CLI:
  - `npm run release:preflight`: 27 files, 568 tests passed

## 후행 과제

> [!note]
> 이번 변경은 fail-closed contract hardening이다. UI에서 invalid query string을 직접 조작하는 사용자는 422를 받을 수 있지만, Frontend client/page는 typed filter만 전송하므로 정상 UI 플로우에는 영향이 없어야 한다.

- 실제 운영 domain 적용 후 public discovery route smoke에서 `/search` / `/leaderboard` invalid query error copy가 사용자에게 충분히 명확한지 확인한다.
- OpenAPI schema snapshot을 별도 artifact로 남기는 작업은 현재 신규 기능 범위라 보류한다.

## 관련 문서

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Search Explore Nested Contract Guard 2026-06-08]]
- [[Frontend Leaderboard Adapter Fail Closed 2026-06-08]]
