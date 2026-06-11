---
title: Frontend API Public User Split 2026-06-11
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/refactor
updated: 2026-06-11
---

# Frontend API Public User Split 2026-06-11

## 목적

Notification contract split 이후 생긴 `PublicUser` parser 중복을 제거하고, Frontend 전체 nested user payload가 하나의 fail-closed parser를 공유하게 한다.

## 변경

- `agentfeed-frontend/src/lib/api-public-user.ts` 추가.
  - `ApiUser`, `ApiUserStats`, `ApiUserPublic` 타입 소유.
  - backend public user allowlist와 stats alias parsing을 소유.
  - `normalizePublicUserForContract`, `normalizeUserForContract`, `normalizeUserPublic`를 제공.
- `agentfeed-frontend/src/lib/api.ts`는 public-user 타입/export와 기존 nested parser call surface만 유지.
- `agentfeed-frontend/src/lib/api-notifications.ts`는 notification-local public-user parser 중복을 제거하고 shared `normalizePublicUserForContract`를 사용.
- `page-source-contract.test.ts`의 public-user source guard를 새 module로 이동.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm test
NEXT_PUBLIC_API_URL=http://localhost:8000 \
  AGENTFEED_ALLOW_LOCAL_API_BUILD=1 \
  AGENTFEED_SKIP_PROD_API_COMPAT=1 \
  npm run build
```

결과:

- `npm run lint`: 통과.
- `npm test`: 통과.
- `npm run build`: 통과, Next.js 15.5.19 production build 성공.

## LOC evidence

```text
src/lib/api.ts pure LOC: 1664
src/lib/api-public-user.ts pure LOC: 126
src/lib/api-notifications.ts pure LOC: 72
src/lib/page-source-contract.test.ts pure LOC: 1202
```

> [!warning]
> `api.ts`와 `page-source-contract.test.ts`는 여전히 250 pure LOC를 초과한다. 이번 slice는 PublicUser parser consolidation까지 완료했으며, 다음 slice에서는 search/explore/project summary parser cluster 또는 source-contract test split을 이어가야 한다.

## Commit

- Frontend: `54cd0c0` — `Centralize frontend public user contracts`

## 후속 작업

- `api.ts`의 search/explore parser cluster를 dedicated module로 분리한다.
- `api.ts`의 worklog detail/card parser cluster를 단계적으로 분리한다.
- `page-source-contract.test.ts`를 domain별 source guard test로 분리한다.
