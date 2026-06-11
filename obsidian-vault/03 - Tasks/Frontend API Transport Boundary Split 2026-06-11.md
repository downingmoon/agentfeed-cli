---
title: Frontend API Transport Boundary Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/refactor
status: completed
aliases:
  - 2026-06-11 Frontend API Transport Split
---

# Frontend API Transport Boundary Split 2026-06-11

> [!success] 완료
> `agentfeed-frontend/src/lib/api.ts`에서 API transport/error boundary 책임을 `src/lib/api-transport.ts`로 분리했다. `src/lib/api`의 public export surface는 유지했다.

## 왜 했나

[[Frontend API Response Envelope Split 2026-06-11]] 이후에도 `src/lib/api.ts`가 endpoint facade, domain type, normalizer, transport/error 처리를 모두 가진 과대 boundary였다. 신규 기능 없이 enterprise 유지보수성을 높이기 위해, 모든 endpoint client가 공유하는 transport/error boundary를 먼저 안정화했다.

## 변경 내용

- 추가: `src/lib/api-transport.ts`
  - `buildApiUrl()`
  - `ApiError`
  - `apiErrorCategory()` / `apiErrorDisplayMessage()`
  - `AUTH_ERROR_EVENT_NAME`
  - `API_REQUEST_TIMEOUT_MS`
  - `API_RESPONSE_TEXT_MAX_BYTES`
  - private `apiFetch()` / response body read / timeout / success-envelope guard
- 변경: `src/lib/api.ts`
  - transport public API를 새 모듈에서 re-export
  - endpoint clients는 새 `apiFetch()`를 내부 import해 기존 동작 유지
- 변경: `src/lib/api-json-boundary.contract.test.ts`
  - JSON parse unknown-boundary source invariant를 새 소유 파일인 `api-transport.ts`로 이동

## 검증 evidence

- Frontend commit: `1b222ac Separate frontend API transport boundary`
- `npm run lint` 통과
- `npm test` 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build` 통과
- LOC snapshot:
  - `src/lib/api.ts`: 2,671 lines / 2,362 pure LOC
  - `src/lib/api-transport.ts`: 275 lines / 250 pure LOC
  - `src/lib/api-response.ts`: 70 lines / 61 pure LOC
  - `src/lib/api-compatibility.ts`: 63 lines / 55 pure LOC

## 후행 과제

> [!warning] 남은 구조 리스크
> `src/lib/api.ts`는 여전히 2,362 pure LOC로 과대하다. `api-transport.ts`도 250 pure LOC ceiling에 정확히 닿아 있으므로 transport에 기능을 추가하지 말고 더 쪼개야 한다.

권장 다음 순서:

1. `src/lib/api.ts`의 독립 domain normalizer부터 분리한다. 후보: integration guide, ingestion token, social action response.
2. `api-transport.ts`에 변경이 필요해지면 response body reader 또는 `ApiError` classification을 먼저 별도 파일로 분리한다.
3. endpoint client group 분리는 normalizer 의존성이 더 줄어든 뒤 진행한다.
4. 각 분리마다 `npm run lint`, `npm test`, 필요시 `npm run build` 실행.

## 관련 문서

- [[Cross Repo Contract Audit 2026-06-11]]
- [[Frontend API Compatibility Split 2026-06-11]]
- [[Frontend API Response Envelope Split 2026-06-11]]
- [[Active Tasks]]
