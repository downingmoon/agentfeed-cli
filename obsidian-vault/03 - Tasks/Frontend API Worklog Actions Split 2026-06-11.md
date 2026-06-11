---
title: Frontend API Worklog Actions Split 2026-06-11
aliases:
  - API Worklog Actions Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Worklog Actions Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 있던 worklog action response parser를 `src/lib/api-worklog-actions.ts`로 분리했다.

- `normalizeResolvePrivacyFindingResponse`, `normalizePublishWorklogResponse`, `normalizeUnpublishWorklogResponse`를 전용 모듈이 소유한다.
- `PRIVACY_FINDING_RESOLUTIONS`는 worklog action module에서 export하고, 기존 privacy finding parser가 같은 상수를 import해 공유한다.
- `worklogs.resolvePrivacyFinding`, `worklogs.publish`, `worklogs.unpublish` 호출 surface는 그대로 유지했다.
- 신규 기능 없이 parser 책임만 분리한 behavior-preserving refactor다.

## 검증

- Frontend commit: `1bdeded Isolate frontend worklog action parsers`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-worklog-actions.ts`: 40 pure LOC
- `src/lib/api.ts`: 2,118 pure LOC
- `src/lib/api-social-actions.ts`: 38 pure LOC
- `src/lib/api-contract-primitives.ts`: 88 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,198 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 기능 추가보다 domain별 parser/client extraction과 source-contract test split을 계속 우선해야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 ingestion token parser/client boundary를 별도 모듈로 분리.
2. `src/lib/api.ts`에서 user/profile settings parser를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API contract/source guard/UI route guard 파일로 분리.

관련 문서: [[Frontend API Social Actions Split 2026-06-11]], [[Frontend API Contract Primitives Split 2026-06-11]]
