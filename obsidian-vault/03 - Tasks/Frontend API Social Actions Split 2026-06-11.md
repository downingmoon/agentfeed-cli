---
title: Frontend API Social Actions Split 2026-06-11
aliases:
  - API Social Actions Split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Social Actions Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 있던 social action response parser를 `src/lib/api-social-actions.ts`로 분리했다.

- `normalizeLikeResponse`, `normalizeBookmarkResponse`, `normalizeFollowResponse`를 전용 모듈이 소유한다.
- social response의 boolean/count fail-closed guard는 `api-contract-primitives.ts`의 shared primitive를 재사용한다.
- `social.like`, `social.unlike`, `social.bookmark`, `social.unbookmark`, `users.follow`, `users.unfollow` 호출 surface는 그대로 유지했다.
- 신규 기능 없이 parser 책임만 분리한 behavior-preserving refactor다.

## 검증

- Frontend commit: `bca1a44 Isolate frontend social action parsers`
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과

## LOC 상태

- `src/lib/api-social-actions.ts`: 38 pure LOC
- `src/lib/api.ts`: 2,165 pure LOC
- `src/lib/api-contract-primitives.ts`: 88 pure LOC
- `src/lib/page-source-contract.test.ts`: 1,198 pure LOC

> [!warning] 남은 리스크
> `src/lib/api.ts`와 `src/lib/page-source-contract.test.ts`는 여전히 oversized 상태다. 계속 domain별 parser/client extraction과 source-contract test split을 진행해야 한다.

## 다음 후보

1. `src/lib/api.ts`에서 worklog action response parser를 별도 모듈로 분리.
2. `src/lib/api.ts`에서 ingestion token parser/client boundary를 별도 모듈로 분리.
3. `src/lib/page-source-contract.test.ts`를 API contract/source guard/UI route guard 파일로 분리.

관련 문서: [[Frontend API Contract Primitives Split 2026-06-11]], [[Frontend API Integration Guide Split 2026-06-11]]
