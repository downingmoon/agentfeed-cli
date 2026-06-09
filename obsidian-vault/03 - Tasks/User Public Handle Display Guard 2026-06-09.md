---
title: User Public Handle Display Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - quality/ux
  - contract/user-identity
status: done
related:
  - "[[GitHub Avatar Fallback Refresh 2026-06-08]]"
  - "[[User Avatar Residual Coverage 2026-06-08]]"
---

# User Public Handle Display Guard 2026-06-09

> [!success] 완료
> GitHub avatar가 붙은 사용자 UI surface에서 백엔드 id-only fallback을 공개 `@handle`처럼 표시할 수 있는 경로를 공통 display helper로 정리했다.

## 문제

- `adaptUser()`는 `username === null`인 사용자도 UI 안정성을 위해 `username` 필드에 backend id를 보존한다.
- 일부 avatar-bearing surface가 `@{user.username}`을 직접 렌더링하면 public username이 없는 사용자의 backend id/UUID가 public handle처럼 보일 수 있다.
- profile link는 이미 `profileUsername` 기준으로 보호되어 있었지만, 텍스트 handle 표시는 surface마다 흩어져 있어 회귀 위험이 있었다.

## 수정

- Frontend `src/lib/user-display.ts` 추가
  - `userHandleLabel(user)`
    - public username이 있으면 `@username`
    - backend가 public username 부재를 `profileUsername: null`로 명시하면 display name으로 대체
    - legacy/manual user처럼 `profileUsername`이 없으면 기존 `username` 표시 유지
  - `userInitialsSeed(user)`
    - avatar fallback initials는 안정적인 identity seed를 사용하되 public handle로 노출하지 않는다.
- 다음 surface에서 직접 `@username` 렌더링을 shared helper로 교체
  - Feed trending/rising builder
  - Worklog cards A/B/C
  - Worklog detail author/comment rows
  - Notifications actor rows
  - Leaderboard podium/rank rows
  - Search user/prompt author rows
- Source contract와 runtime contract를 보강해 id-only avatar user가 backend id를 public handle로 노출하지 않도록 고정했다.

## 검증

```bash
npm run lint
npm test
npm run check:api-compatibility:mock
AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 NEXT_PUBLIC_API_URL=https://api.agentfeed.dev NEXT_PUBLIC_REVIEW_BASE_URL=https://agentfeed.dev npm run ci
cd ../agentfeed-dev && node scripts/check-openapi-contract.mjs
```

결과:

- `npm run lint`: 통과
- `npm test`: contract tests 통과
- `npm run check:api-compatibility:mock`: `FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03`
- local DNS-less `npm run ci`: typecheck, audit, contract, mock compatibility, production build 통과
- OpenAPI contract gate: 75 operations / 70 client contracts 통과

## 서버/배포

> [!info]
> active goal 규칙에 따라 서버 배포는 수행하지 않았다.

## 후속 작업

- [ ] 실제 렌더링 스모크에서 id-only user fixture가 있는 leaderboard/search/feed row를 시각 확인한다.
- [ ] Project owner display surface도 public username 부재 시 backend id가 사람이 보는 handle로 노출되지 않는지 별도 패스에서 추가 점검한다.
