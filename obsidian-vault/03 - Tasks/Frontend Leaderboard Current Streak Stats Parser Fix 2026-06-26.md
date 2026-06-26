---
title: Frontend Leaderboard Current Streak Stats Parser Fix 2026-06-26
aliases:
  - Leaderboard current streak stats parser fix
status: done
tags:
  - agentfeed/frontend
  - agentfeed/bugfix
  - agentfeed/deploy
  - project/tasks
updated: 2026-06-26
---

# Frontend Leaderboard Current Streak Stats Parser Fix 2026-06-26

## 결론

Leaderboard page가 `Leaderboard API를 불러오지 못했습니다`를 표시했다. Backend `/v1/leaderboard?type=most_shipped&period=week&limit=20`는 `200 OK`였고, 실패 원인은 frontend adapter가 normalized `ApiUserStats.current_streak_days`를 unexpected field로 거부한 것이다.

## 원인 증거

- Public backend leaderboard API: `200 OK`.
- Playwright browser QA before fix body:
  - `Ranking is temporarily unavailable`
  - `Leaderboard API를 불러오지 못했습니다`
  - `Leaderboard API returned malformed ranking rows: item 0.user.stats contains unexpected field current_streak_days`
- Root cause: `api-public-user.ts`는 backend `stats: null`을 normalized default stats로 바꾸면서 `current_streak_days: 0`을 포함한다. 이후 `leaderboard-adapter.ts`가 같은 normalized stats를 다시 검증하면서 `current_streak_days`를 허용하지 않아 실패했다.

## 변경

- `agentfeed-frontend/src/lib/leaderboard-adapter.ts`
  - `safeStats` allowed fields에 `current_streak_days` 추가.
  - `safeStats` 반환값에 `current_streak_days` 보존.
- `agentfeed-frontend/src/lib/public-user-leaderboard-contract-fixtures.ts`
  - leaderboard stats fixture에 `current_streak_days: 0` 추가해 live normalized stats shape를 고정.

## Commit

- `agentfeed-frontend` `2c0fda5` — `Accept leaderboard current streak stats`

## 검증

- Red test first: `npm run test:contracts -- src/lib/public-user-leaderboard-contracts.contract.test.ts`가 `current_streak_days` unexpected field로 실패함 확인.
- Targeted green: `npm run test:contracts -- src/lib/public-user-leaderboard-contracts.contract.test.ts src/lib/leaderboard-response-contracts.contract.test.ts` 통과.
- Full frontend contracts: `npm run test:contracts` 통과.
- Typecheck/lint: `npm run lint` 통과.
- Production build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. 기존 multi-lockfile workspace-root warning만 발생.
- No-excuse/LOC scans 통과.
- `git diff --check` 통과.
- LSP diagnostics unavailable: `Transport closed`; contract tests/typecheck/build로 대체.
- 참고: `NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 npm run build`는 production build HTTP guard 때문에 실패하는 것이 정상이다.

## 배포/Runtime QA

- 현재 서버 canonical name: `trading-bot`; Codex가 이 서버 위에서 실행 중이라 SSH 없음.
- `/home/ubuntu/dev/agentfeed/agentfeed-frontend` → `/home/ubuntu/agentfeed/agentfeed-frontend` rsync.
- Frontend force-recreate, frontend healthy.
- `scripts/wait-ready.sh` 통과.
- Public frontend `/leaderboard` returned `HTTP/1.1 200 OK`.
- Public backend leaderboard API returned `most_shipped week 1`.
- Playwright browser QA after deploy:
  - page shows ranked board and `downingmoon` podium/rank row.
  - leaderboard API response `200`.
  - `Leaderboard API를 불러오지 못했습니다` no longer visible.

## 후행 TODO

- [x] User-reported leaderboard API load failure fixed and deployed.
- [x] Regression contract added.
- [x] Manual browser QA completed.
