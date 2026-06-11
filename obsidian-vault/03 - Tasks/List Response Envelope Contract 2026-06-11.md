---
type: task-note
created: 2026-06-11
status: completed
repos:
  - agentfeed-frontend
  - agentfeed-backend
  - AgentFeed-CLI
scope: contract-hardening
---

# List Response Envelope Contract 2026-06-11

## 목표

Backend의 `ListResponse`/`Pagination` 계약과 Frontend의 list/read 응답 파서가 같은 수준으로 drift를 거부하는지 점검했다.

## 발견

Backend는 다음 모델에 `extra="forbid"`가 적용되어 있다.

- `ListResponse`
- `Pagination`

Frontend의 `apiFetch`는 성공 응답 root envelope의 예상 외 필드를 거부하고 있었지만, `normalizeStrictListResponse`/`normalizeStrictPagination` 공용 helper는 직접 호출 경계에서 다음 drift를 놓칠 수 있었다.

- `pagination.total`
- list response root의 예상 외 필드

## 수정

Frontend `src/lib/api-response.ts`에서 strict helper가 다음 allowlist를 강제하도록 보강했다.

- list response: `data`, `pagination`
- pagination: `next_cursor`, `has_more`

`src/lib/api-contract.test.ts`에는 comment list 경로의 `pagination.total` drift가 contract error로 실패하는 케이스를 추가했다.

## 검증

- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_error_contracts.py tests/test_route_response_model_contracts.py tests/test_cursor_public_list_contracts.py tests/test_leaderboard_contracts.py`

결과: 모두 통과.

## 후속 과제

- 신규 기능 없음.
- 서버/배포/CICD 작업 없음.
- 다음 slice에서는 leaderboard/search처럼 자체 list response shape를 갖는 경계의 nested field rejection을 점검한다.
