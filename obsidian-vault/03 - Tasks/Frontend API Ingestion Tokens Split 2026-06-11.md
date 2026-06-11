---
title: Frontend API Ingestion Tokens Split 2026-06-11
aliases:
  - API Ingestion Tokens Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Ingestion Tokens Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 있던 ingestion token 타입과 response parser를 `src/lib/api-ingestion-tokens.ts`로 분리했다.

- `ApiIngestionToken`, `ApiCreatedIngestionToken`, `ApiIngestionTokenUser`, `ApiRotatedIngestionToken` 타입을 전용 모듈이 소유한다.
- `normalizeIngestionTokenList`, `normalizeCreatedIngestionToken`, `normalizeRotatedIngestionToken`을 전용 모듈로 이동했다.
- 기존 `@/lib/api` public type export는 유지해 Settings page/API contract tests의 import surface를 깨지 않도록 했다.
- `me.ingestionTokens`, `me.createIngestionToken`, `me.rotateIngestionToken`, `me.revokeIngestionToken` 호출 surface는 그대로 유지했다.
- 신규 기능 없이 token response boundary 책임만 분리한 behavior-preserving refactor다.

## 검증

- Frontend commit: `e4cdbd0 Isolate frontend ingestion token contracts`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-ingestion-tokens.ts`: 101 pure LOC
- `src/lib/api.ts`: 2,006 pure LOC
- `src/lib/api-worklog-actions.ts`: 40 pure LOC
- `src/lib/api-social-actions.ts`: 38 pure LOC
- `src/lib/api-contract-primitives.ts`: 88 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,198 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 다음 slice도 신규 기능이 아니라 domain별 parser/client extraction 또는 source-contract test split이어야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 integration status parser를 integration guide/status 전용 모듈로 분리.
2. `src/lib/api.ts`에서 user/profile/settings parser를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API contract/source guard/UI route guard 파일로 분리.

관련 문서: [[Frontend API Worklog Actions Split 2026-06-11]], [[Frontend API Social Actions Split 2026-06-11]], [[Frontend API Contract Primitives Split 2026-06-11]]
