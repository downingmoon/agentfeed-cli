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

# Leaderboard Search Nested Contract 2026-06-11

## 목표

Backend의 `LeaderboardListResponse`/`SearchResponse` 계열 schema는 nested object까지 `extra="forbid"`를 적용한다. Frontend parser도 같은 수준으로 예상 외 필드 drift를 거부하는지 확인했다.

## 발견

Frontend는 값 타입, enum, pagination은 검증하고 있었지만 다음 nested object의 추가 필드를 일부 통과시킬 수 있었다.

- leaderboard response data
- leaderboard item
- leaderboard metric
- leaderboard viewer_state
- search response data
- search prompt result
- search project result
- search suggestions
- tag items

## 수정

Frontend normalizer에 backend schema와 대응되는 allowlist를 추가했다.

- `src/lib/api-leaderboard.ts`
- `src/lib/api-search.ts`

Contract test에는 search/leaderboard/discovery extra-field drift 케이스를 추가했다.

## 검증

- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_leaderboard_contracts.py tests/test_route_response_model_contracts.py tests/test_cursor_public_list_contracts.py tests/test_error_contracts.py`

결과: 모두 통과.

## 후속 과제

- 신규 기능 없음.
- 서버/배포/CICD 작업 없음.
- 다음 slice에서는 project/read detail 계층 중 자체 normalizer가 backend schema의 `extra="forbid"`와 맞는지 점검한다.
