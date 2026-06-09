---
title: Profile Account Public Handle Display Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - quality-pass
status: done
aliases:
  - Profile Account Handle Guard
---

# Profile Account Public Handle Display Guard 2026-06-09

> [!success] Result
> Profile, Settings, CLI browser authorization 화면에서 `username` 또는 backend `id`가 public `@handle`처럼 직접 렌더링될 수 있는 잔여 경로를 공유 display helper로 정리했다.

## 연결된 작업

- [[User Public Handle Display Guard 2026-06-09]]
- [[Project Owner Public Handle Display Guard 2026-06-09]]

## 배경

이전 pass에서 worklog/user 카드와 project owner 표시를 보강했지만, 추가 검색 결과 다음 표면이 남아 있었다.

- `ProfilePage` header: `@{user.username}` 직접 표시
- `ProfilePage` follow aria/status copy: `user.username` / route `username` 직접 사용
- `ProfilePage` prompts tab avatar initials: `user.username.slice(0, 2)`
- `CliAuthorizePage` 승인 계정 표시: `state.user.username ? @username : state.user.id`
- `SettingsPage` intro copy/avatar initials: `currentUser.username` / `profile.username.slice(...)`

## 변경 범위

- `agentfeed-frontend/src/components/pages/ProfilePage.tsx`
  - header handle을 `userHandleLabel(user)`로 통일.
  - follow button accessible label은 display name 기반으로 변경.
  - follow 성공 copy는 profile data가 있으면 `userHandleLabel(user)`를 사용.
  - prompt card avatar initials는 `userInitialsSeed(user)`를 사용.
- `agentfeed-frontend/src/components/pages/CliAuthorizePage.tsx`
  - `readyUser = adaptUser(state.user)`를 한 번 만들고, 계정 handle 표시를 `userHandleLabel(readyUser)`로 통일.
  - username이 없을 때 backend id를 그대로 표시하던 fallback 제거.
- `agentfeed-frontend/src/components/pages/SettingsPage.tsx`
  - settings intro copy를 `userHandleLabel(adaptUser(currentUser))`로 통일.
  - settings avatar initials를 current user가 있으면 `userInitialsSeed(adaptUser(currentUser))`로 통일.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - 위 surface들이 raw username/id fallback으로 회귀하지 않도록 source contract 추가.

## 검증

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run check:api-compatibility:mock`
- [x] `AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 NEXT_PUBLIC_API_URL=https://api.agentfeed.dev NEXT_PUBLIC_REVIEW_BASE_URL=https://agentfeed.dev npm run ci`
- [x] `node scripts/check-openapi-contract.mjs` in `agentfeed-dev`

## 서버/배포

> [!info]
> 이 goal의 필수 규칙에 따라 이번 pass에서는 서버 배포를 하지 않았다.

## 남은 확인

- [ ] `LandingPage`의 demo preview author는 정적 marketing fixture이므로 API backend id 노출은 아니지만, public identity copy consistency 관점에서 별도 디자인/카피 pass 때 점검한다.
- [ ] 실제 `username: null` auth/me fixture 기반 CLI authorize와 Settings 화면의 browser visual QA를 후속으로 수행한다.
