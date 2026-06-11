---
title: Frontend API Username Check Split 2026-06-11
status: done
date: 2026-06-11
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/verification
aliases:
  - Frontend username check contract split
---

# Frontend API Username Check Split 2026-06-11

## 결과

Frontend `src/lib/api.ts`에 남아 있던 username availability response 계약을 `src/lib/api-username-check.ts`로 분리했다.

- `ApiUsernameCheckReason` / `ApiUsernameCheckResponse` / `normalizeUsernameCheck`를 전용 모듈로 이동.
- `@/lib/api` public export와 `users.checkUsername()` 호출 surface는 유지.
- `page-source-contract.test.ts`의 username-check source guard를 새 모듈 기준으로 이동.

## 왜 검색 split 대신 이 작업을 먼저 했나

검색 response parser는 worklog card parser에 의존한다. 즉시 `api-search.ts`로 분리하면 search와 worklog-card 계약을 동시에 건드리는 큰 slice가 되어 risk가 커진다.

> [!note]
> Search contract split은 `normalizeWorklogCardForContract` 계열을 먼저 분리한 뒤 진행하는 편이 안전하다.

## 검증

- Frontend commit: `b1c7f2d` (`Isolate frontend username check contracts`)
- `npm run lint`: 통과
- `npm test`: 통과
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run build`: 통과
- LOC evidence:
  - `src/lib/api-username-check.ts`: 21 pure LOC
  - `src/lib/api.ts`: 1647 pure LOC, inherited oversized file이며 이번 slice에서 26줄 감소
  - `src/lib/page-source-contract.test.ts`: 1203 pure LOC, inherited oversized test file

## 후행 작업

- [ ] `src/lib/api.ts`의 worklog-card response contract를 먼저 전용 모듈로 분리.
- [ ] 그 다음 search response/client contract를 `api-search.ts`로 분리.
- [ ] `src/lib/page-source-contract.test.ts`도 domain별 source-contract test로 분할.
