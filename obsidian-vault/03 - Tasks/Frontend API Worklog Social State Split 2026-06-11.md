---
title: Frontend API Worklog Social State Split 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/social
  - agentfeed/verification
aliases:
  - Frontend worklog social state contract split
---

# Frontend API Worklog Social State Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 남아 있던 worklog social stats와 viewer state 계약을 `src/lib/api-worklog-social-state.ts`로 분리했다.

- `ApiWorklogSocialStats` / `ApiWorklogViewerState`를 전용 모듈로 이동.
- `normalizeWorklogSocialStatsForContract`와 `optionalWorklogViewerStateForContract`를 card/detail 양쪽에서 공유하도록 정리.
- `@/lib/api` public type export는 유지.
- `page-source-contract.test.ts`에 social/viewer state parser source guard를 추가.

## 왜 이 slice를 먼저 했나

`normalizeWorklogCardForContract`는 metrics/source, social/viewer state, project summary parser를 모두 참조한다. 이전 slice에서 metrics/source를 분리했고, 이번 slice에서 social/viewer state를 분리해 card parser 분리 전 의존성을 하나 더 줄였다.

> [!note]
> 이 작업은 social UI hydration, like/bookmark count, comment composer gating의 contract mismatch를 숨기지 않게 하는 기반이다. malformed `social` 또는 present-but-invalid `viewer_state`는 UI adapter 이전 API boundary에서 fail-closed 되어야 한다.

## 검증

- Frontend commit: `3a0fdb8` (`Isolate frontend worklog social contracts`)
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과
- LOC evidence:
  - `src/lib/api-worklog-social-state.ts`: 38 pure LOC
  - `src/lib/api.ts`: 1438 pure LOC, inherited oversized file이며 이번 slice에서 39 pure LOC 감소
  - `src/lib/page-source-contract.test.ts`: 1213 pure LOC, inherited oversized test file

## 후행 작업

- [ ] `ApiProjectSummary` read parser를 전용 모듈로 분리.
- [ ] 그 다음 `normalizeWorklogCardForContract`와 worklog card list response parser를 `api-worklog-card.ts`로 분리.
- [ ] worklog-card 분리 후 search response/client contract를 `api-search.ts`로 분리.
- [ ] `src/lib/page-source-contract.test.ts`를 domain별 source-contract test로 분할.
