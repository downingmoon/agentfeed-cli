---
title: Frontend Profile Link Identity Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - ui
  - profile
  - avatar
  - completed
status: completed
---

# Frontend Profile Link Identity Guard 2026-06-08

> [!success]
> GitHub avatar는 보존하되 public username이 없는 사용자에게 backend id를 `/profile/:username`처럼 링크하던 잔여 경로를 막았다.

## 범위

- [[Integration - CLI Backend Frontend]]
- 이전 루프 [[User Avatar Owner Review Coverage 2026-06-08]]의 follow-up인 profile-link/id fallback hardening.
- 신규 기능은 추가하지 않았다. 기존 사용자 표면의 링크 contract를 더 안전하게 만든 작업이다.
- 서버 배포, 인프라, CI/CD는 목표 규칙에 따라 제외했다.

## 발견한 gap

1. Header profile affordance
   - `currentUser.username ?? currentUser.id ?? 'me'` 형태로 profile href를 만들 수 있었다.
   - GitHub 로그인 직후 username이 아직 설정되지 않은 계정은 backend id가 public profile route처럼 쓰일 수 있었다.

2. Public discovery surfaces
   - `/feed` rising builders, `/explore` rising builders, `/leaderboard`, `/search` user results가 `user.username` 또는 `username ?? id`로 profile link를 만들었다.
   - adapter가 avatar 보존을 위해 `username`에 backend id fallback을 유지하므로, link 생성은 별도 public username contract를 봐야 한다.

3. Worklog detail author row
   - author avatar는 보이지만 author link가 `u.username` fallback을 사용했다.
   - id-only author는 profile link 대신 avatar/name만 표시해야 한다.

## 수정

- `src/lib/profile-link.ts`
  - `profileUsernameForUser()` 추가.
  - `profileHrefForUser()` 추가: `profileUsername === null`이면 `null`, public username이 있을 때만 `/profile/:username` 반환.
  - `profileHrefForApiUser()` 추가: auth/API identity는 `username`만 사용하고 `id` fallback은 금지.

- `src/components/layout/Header.tsx`
  - profile href는 `profileHrefForApiUser(currentUser)`로 계산.
  - public username이 없으면 `/settings`로 보내 username 설정/프로필 정리 흐름으로 유도.

- `src/components/pages/FeedPage.tsx`
  - rising builders profile control은 `profileHrefForUser(user)`가 있을 때만 profile로 이동.
  - follow action도 public username이 있을 때만 렌더링해 `/users/:id/follow` 같은 잘못된 API 호출을 피한다.

- `src/components/pages/SearchPage.tsx`
  - user result는 public username이 있으면 link card, 없으면 non-link card로 렌더링.

- `src/components/pages/ExplorePage.tsx`
  - rising builders row는 public username이 있을 때만 profile link가 된다.

- `src/components/pages/LeaderboardPage.tsx`
  - podium/list row 모두 public username이 있을 때만 profile link/chevron을 렌더링.

- `src/components/pages/WorklogDetailPage.tsx`
  - author row는 public username이 있을 때만 native `Link`가 된다.
  - id-only author는 avatar/name identity block으로만 표시한다.

## Regression coverage

- `src/lib/api-contract.test.ts`
  - public username이 있으면 `/profile/:username`을 반환.
  - id-only avatar user는 `profileHrefForUser()`와 `profileUsernameForUser()`가 `null`을 반환.
  - legacy/manual `User` 객체는 `profileUsername` 필드가 없을 때 `username` fallback을 유지.
  - API identity helper는 `username`만 쓰고 `id` fallback을 금지.

- `src/lib/page-source-contract.test.ts`
  - Search/Explore/Leaderboard/Feed/WorklogDetail/Header가 profile helper를 쓰도록 고정.
  - backend id를 profile route로 쓰는 기존 pattern 회귀를 금지.
  - 기존 접근성 contract는 유지하되 id-only profile link는 만들지 않도록 조정.

## Verification

- RED
  - `npm run test:contracts` 실패: `Cannot find module './profile-link'`.

- GREEN
  - Frontend `npm run test:contracts` ✅
  - Frontend `npm run lint` ✅
  - Frontend `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_REVIEW_BASE_URL=http://localhost:3000 npm run build` ✅

## Follow-up

> [!todo]
> 이번 hardening은 Frontend 표시/link 계층에서 backend id profile fallback을 막는다. Backend public profile API가 username 미설정 사용자를 어떤 public visibility 상태로 취급하는지에 대한 정책 문서는 아직 별도 정리 여지가 있다.

- 실제 브라우저 visual smoke와 서버 배포는 수행하지 않았다.
