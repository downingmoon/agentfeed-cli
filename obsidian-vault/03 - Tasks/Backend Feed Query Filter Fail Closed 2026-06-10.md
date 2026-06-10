---
type: task
status: done
created: 2026-06-10
tags:
  - agentfeed/contract
  - agentfeed/backend
repos:
  - agentfeed-backend
  - agentfeed-frontend
  - AgentFeed-CLI
related:
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Frontend Feed Filter Parser Guard 2026-06-10]]"
  - "[[Backend Cursor Pagination Contract Split 2026-06-10]]"
---

# Backend Feed Query Filter Fail Closed 2026-06-10

## 배경

Frontend `src/lib/feed-filters.ts`는 feed sort/time filter를 정해진 Backend query 값으로만 직렬화한다.

- sort: `latest`, `trending`, `most_liked`, `most_discussed`
- time_range: `today`, `week`, `month`, `all`

Backend `/v1/feed`와 `/v1/feed/following`은 이 값을 실제로 처리하고 있었지만, 알 수 없는 `sort`는 조용히 latest ordering으로 fallback됐다. `time_range`도 helper 단계에서는 unknown 값을 all처럼 취급할 수 있었다.

이 동작은 UI에서는 잘 보이지 않지만 API contract 관점에서는 문제가 있다.

- Frontend/CLI/외부 클라이언트가 잘못된 query를 보내도 오류가 보이지 않는다.
- DB query까지 내려간 뒤 환경에 따라 500이 될 수 있다.
- 사용자는 “필터가 적용되지 않은 정상 응답”처럼 오해할 수 있다.

## 변경

- `agentfeed-backend/app/routers/feed.py`
  - `FeedSort`, `FeedTimeRange`를 `Literal` query contract로 선언.
  - `/v1/feed`와 `/v1/feed/following`의 `sort`를 closed enum으로 제한.
  - `/v1/feed`의 `time_range`를 closed enum으로 제한.
  - unknown sort/time_range가 DB에 도달하지 않고 FastAPI validation error로 종료되도록 변경.
  - `most_shipped` legacy alias와 unknown-sort latest fallback 주석 제거.
- `agentfeed-backend/tests/test_error_contracts.py`
  - `sort=unknown`, `time_range=decade`가 strict error envelope의 422로 노출되는 regression 추가.
- `agentfeed-backend/tests/test_feed_contracts.py`
  - helper의 unknown time_range fallback 기대값 제거.
  - OpenAPI에 feed/following sort enum과 feed time_range enum이 노출되는 contract 추가.

## Contract

Backend feed query boundary는 Frontend가 사용하는 필터 값만 허용한다.

- `/v1/feed?sort=unknown` → `422 VALIDATION_ERROR`
- `/v1/feed?time_range=decade` → `422 VALIDATION_ERROR`
- `/v1/feed/following` sort OpenAPI enum은 public feed와 동일해야 한다.
- 잘못된 필터 값은 조용한 fallback이나 DB-level failure로 전환하지 않는다.

## 검증

- Red 확인:
  - `uv run pytest tests/test_error_contracts.py::test_client_visible_error_responses_use_strict_error_envelope -q`
  - 기존 구현에서 `/v1/feed?sort=unknown`이 422가 아니라 DB 연결 시도 후 500으로 실패.
- Green 확인:
  - `uv run pytest tests/test_error_contracts.py::test_client_visible_error_responses_use_strict_error_envelope tests/test_feed_contracts.py -q` → 8 passed.
  - `uv run pytest -q` → 439 passed.
  - `uv run ruff check .` → passed.
- LOC 확인:
  - `app/routers/feed.py` → 229 pure LOC.
  - `tests/test_error_contracts.py` → 202 pure LOC.
  - `tests/test_feed_contracts.py` → 239 pure LOC.
- LSP diagnostics:
  - `basedpyright-langserver` 미설치로 실행 불가. `pytest`와 `ruff`로 대체 검증했다.

## 후행 과제

> [!todo]
> `tests/test_error_contracts.py`와 `tests/test_feed_contracts.py`가 200 LOC warning band에 있다. 다음에 같은 파일을 확장해야 하면 관련 error/feed route contract를 더 작은 파일로 분리한다.
