---
title: Frontend API Response Envelope Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/refactor
status: completed
aliases:
  - 2026-06-11 Frontend API Response Wrapper Split
---

# Frontend API Response Envelope Split 2026-06-11

> [!success] 완료
> `agentfeed-frontend/src/lib/api.ts`에서 API response envelope 타입과 list pagination normalizer 책임을 `src/lib/api-response.ts`로 분리했다. `src/lib/api` public export surface는 유지했다.

## 왜 했나

[[Frontend API Compatibility Split 2026-06-11]] 이후에도 `src/lib/api.ts`가 2,600 pure LOC를 넘는 과대 API boundary로 남아 있었다. 신규 기능 없이 enterprise 유지보수성을 높이기 위해, endpoint client보다 먼저 모든 route group이 공유하는 response wrapper 책임을 안정적으로 분리했다.

## 변경 내용

- 추가: `src/lib/api-response.ts`
  - `Pagination`
  - `DataResponse<T>`
  - `ListResponse<T>`
  - `normalizeListResponse<T>()`
  - `normalizeStrictPagination()`
  - `normalizeStrictListResponse()`
- 변경: `src/lib/api.ts`
  - response wrapper 타입/normalizer를 새 모듈에서 import/re-export
  - endpoint client와 normalizer public API는 유지
- 변경: `src/lib/page-source-contract.test.ts`
  - response-wrapper invariant source check를 새 소유 모듈인 `api-response.ts`로 이동

## 검증 evidence

- Frontend commit: `e89cfc9 Separate frontend API response envelopes`
- `npm run lint` 통과
- `npm test` 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build` 통과
- LOC snapshot:
  - `src/lib/api.ts`: 2,944 lines / 2,609 pure LOC
  - `src/lib/api-response.ts`: 70 lines / 61 pure LOC
  - `src/lib/api-compatibility.ts`: 63 lines / 55 pure LOC

## 후행 과제

> [!warning] 남은 구조 리스크
> `src/lib/api.ts`는 여전히 2,609 pure LOC로 과대하다. 다음 단계도 public export를 유지한 채 작은 책임 단위로 분리해야 한다.

권장 다음 순서:

1. `ApiError`와 `apiFetch` transport/error boundary를 별도 모듈로 뺄 수 있는지 의존성 점검.
2. transport 분리가 위험하면, integration guide normalizer처럼 독립적인 domain normalizer를 먼저 분리.
3. endpoint client group 분리는 shared normalizer와 transport 의존이 더 줄어든 뒤 진행.
4. source-contract test는 invariant의 실제 소유 파일을 검사하도록 계속 이동/보강.

## 관련 문서

- [[Cross Repo Contract Audit 2026-06-11]]
- [[Frontend API Compatibility Split 2026-06-11]]
- [[Active Tasks]]
