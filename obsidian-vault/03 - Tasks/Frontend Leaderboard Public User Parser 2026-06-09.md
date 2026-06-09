---
title: Frontend Leaderboard Public User Parser 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - leaderboard
  - api-contract
  - public-user
status: done
related:
  - "[[Frontend Public User Contract Alignment 2026-06-09]]"
  - "[[Settings Profile Save Public User Boundary 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Frontend Leaderboard Public User Parser 2026-06-09

> [!success] Status
> 완료. Backend `LeaderboardItem.user`가 `PublicUser`인 계약에 맞춰 Frontend leaderboard user parser를 shared `normalizePublicUserForContract()` 경로로 통합했다.

## 배경

- Backend: `agentfeed-backend/app/schemas/leaderboard.py`
  - `LeaderboardItem.user: PublicUser`
  - `LeaderboardItem.viewer_state`는 leaderboard row 자체의 viewer state로 별도 존재한다.
- Frontend 기존 상태:
  - `ApiLeaderboardItem.user` 타입은 `ApiUserPublic`으로 맞아 있었지만, `normalizeLeaderboardUser()`가 `normalizeUserForContract()` + 수동 `stats/viewer_state` 조합을 자체 구현하고 있었다.
  - 현재 동작은 대부분 동일하지만, shared PublicUser parser를 우회하면 Backend `PublicUser` 필드/검증 규칙 변경 시 leaderboard 경로만 drift될 위험이 있다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeLeaderboardUser()`를 `normalizePublicUserForContract(value, 'user', leaderboardContractError)`로 단순화.
  - leaderboard item의 별도 `viewer_state` parser는 그대로 유지.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - leaderboard user가 shared PublicUser parser를 사용하도록 source-level guard 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
npm test
npm run lint
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
  NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
  NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
  npm run build
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- Targeted API/source contract tests 통과.
- 전체 Frontend contract tests 통과.
- TypeScript `tsc --noEmit` 통과.
- Next production build 통과.
- Dev OpenAPI contract gate 통과.

## 배포

- Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 후속 작업

- [ ] `PublicUser` parser를 우회하는 다른 read 경로가 다시 생기지 않도록 source contract guard를 유지한다.
- [ ] Leaderboard row `viewer_state`와 nested `user.viewer_state` 의미가 UI에서 혼동되지 않는지 추후 UX/contract audit에서 확인한다.
- [ ] Dev OpenAPI gate가 nested `PublicUser` parser reuse 여부까지 자동 탐지할 수 있을지 검토한다.
