---
title: Frontend API Contract Primitives Split 2026-06-11
aliases:
  - API Contract Primitives Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Contract Primitives Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 흩어져 있던 공통 contract primitive guard를 `src/lib/api-contract-primitives.ts`로 분리했다.

- `isRecord`, `nonEmptyString`, `isOneOfString`을 전용 모듈이 소유한다.
- `requireStringForContract`, `requireDateForContract`, `nullableStringForContract`, `nullableTrimmedStringForContract`, `requireBooleanForContract`, `requireOneOfForContract`, `nullableOneOfForContract`, `requiredStringArrayForContract`, integer guard를 전용 모듈로 이동했다.
- 기존 `src/lib/api.ts` parser들은 같은 guard를 import해서 사용하므로 public API와 response contract behavior는 유지된다.
- enum parser source contract는 새 primitive owner 파일을 검사하도록 갱신했다.

## 검증

- Frontend commit: `b89bdb1 Centralize frontend API contract primitives`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-contract-primitives.ts`: 88 pure LOC
- `src/lib/api.ts`: 2,189 pure LOC
- `src/lib/api-transport.ts`: 250 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,198 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 다음 작업은 기능 추가가 아니라 domain별 parser/client extraction 또는 source-contract test split이어야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 worklog action response parser를 별도 모듈로 분리.
2. `src/lib/api.ts`에서 social action response parser를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API contract/source guard/UI route guard 파일로 분리.

관련 문서: [[Frontend API Integration Guide Split 2026-06-11]], [[Frontend API Transport Boundary Split 2026-06-11]]
