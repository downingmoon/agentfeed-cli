---
title: Frontend API Integration Status Split 2026-06-11
aliases:
  - API Integration Status Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Integration Status Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 있던 integration status 타입과 response parser를 `src/lib/api-integration-status.ts`로 분리했다.

- `ApiIntegrationConnectionStatus`, `ApiIntegrationStatus` 타입을 전용 모듈이 소유한다.
- `normalizeIntegrationStatuses`와 integration status item parser를 전용 모듈로 이동했다.
- 기존 `@/lib/api` public type export는 유지해 Settings page/API contract imports를 깨지 않도록 했다.
- `me.integrations()` 호출 surface는 그대로 유지했다.
- 신규 기능 없이 `/me/integrations` response boundary 책임만 분리한 behavior-preserving refactor다.

## 검증

- Frontend commit: `21eda72 Isolate frontend integration status contracts`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-integration-status.ts`: 39 pure LOC
- `src/lib/api.ts`: 1,980 pure LOC
- `src/lib/api-ingestion-tokens.ts`: 101 pure LOC
- `src/lib/api-contract-primitives.ts`: 88 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,198 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 다음 slice도 신규 기능이 아니라 domain별 parser/client extraction 또는 source-contract test split이어야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 user/profile/settings parser를 별도 모듈로 분리.
2. `src/lib/api.ts`에서 project mutation/read parser를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API contract/source guard/UI route guard 파일로 분리.

관련 문서: [[Frontend API Ingestion Tokens Split 2026-06-11]], [[Frontend API Worklog Actions Split 2026-06-11]], [[Frontend API Contract Primitives Split 2026-06-11]]
