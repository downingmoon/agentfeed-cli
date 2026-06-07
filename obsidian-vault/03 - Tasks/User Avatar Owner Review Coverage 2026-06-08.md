---
title: User Avatar Owner Review Coverage 2026-06-08
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - ui
  - avatar
  - completed
status: completed
---

# User Avatar Owner Review Coverage 2026-06-08

> [!success]
> feed/worklog 외곽의 text-only 사용자 표면과 username 없는 owner payload에서 GitHub profile image가 빠지는 경로를 추가로 정리했다.

## 범위

- [[Integration - CLI Backend Frontend]]
- [[Frontend GitHub Avatar Coverage 2026-06-08]]와 [[User Avatar Residual Coverage 2026-06-08]] 이후 남은 사용자 avatar gap 점검.
- 이번 루프는 Frontend/API contract 보강만 수행했다. 서버 배포, 인프라, CI/CD 변경은 제외했다.

## 발견한 gap

1. 프로젝트 owner adapter
   - Backend owner payload가 `avatar_url`을 제공해도 `owner.username`이 `null`이면 Frontend adapter가 `ownerUser` 자체를 버렸다.
   - 결과적으로 GitHub avatar가 있는 id-only owner가 project card/detail 계열에서 gradient initials fallback으로 보일 수 있었다.

2. Dashboard 최근 worklog 목록
   - `/dashboard`의 Recent worklogs row는 현재 로그인 사용자가 작성한 worklog 목록인데도 title/status text만 표시했다.
   - `auth.me().avatar_url`을 이미 AppContext가 갖고 있으므로 signed-in GitHub avatar를 같이 보여주는 것이 자연스럽다.

3. Worklog review public preview
   - `/worklogs/:id/review`의 public preview는 실제 feed에 노출될 사용자 게시글 preview인데 author identity가 text-only였다.
   - publish 전 사용자가 “이 GitHub 계정/avatar로 공개된다”는 것을 확인할 수 있도록 author avatar가 필요했다.

4. Project detail owner link safety
   - id-only owner avatar를 보존하면 기존 `/profile/${project.ownerUser.username}` 경로가 backend id를 username처럼 링크할 수 있었다.
   - `profileUsername`이 있을 때만 public profile link를 만들고, 없으면 avatar/name만 표시하도록 분리했다.

## 수정

- `src/lib/types.ts`
  - `User.id`와 `User.profileUsername`을 추가해 backend id와 public username을 분리했다.

- `src/lib/adapters.ts`
  - `adaptUser()`가 `id`, `profileUsername`, `avatarUrl`을 모두 보존한다.
  - `adaptProjectSummary()` / `adaptProjectDetail()`이 `owner.username` 유무와 무관하게 `ownerUser`를 보존한다.

- `src/components/worklog/worklogAuthor.ts`
  - worklog author normalization이 `id`, `profileUsername`, `avatarUrl`을 유지한다.
  - fallback author는 public username을 만들어내지 않도록 `profileUsername: null`을 명시한다.

- `src/components/pages/DashboardPage.tsx`
  - Recent worklogs row에 `Avatar user={currentUser ? adaptUser(currentUser) : undefined}`를 추가했다.
  - dashboard own-worklog row가 signed-in GitHub avatar를 표시한다.

- `src/components/pages/WorklogReviewPage.tsx`
  - public preview 상단에 current author avatar/name/username을 추가했다.
  - publish 전 preview에서 GitHub profile image를 확인할 수 있다.

- `src/components/pages/ProjectDetailPage.tsx`
  - owner avatar를 항상 표시하되, `profileUsername`이 있을 때만 `/profile/:username` 링크로 렌더링한다.
  - username 없는 owner는 backend id를 profile route로 잘못 연결하지 않는다.

## Regression coverage

- `src/lib/api-contract.test.ts`
  - `adaptUser()`가 backend id와 public username을 동시에 보존하는지 검증.
  - username 없는 GitHub avatar user가 initials fallback으로 변질되지 않는지 검증.
  - project adapter가 username 없는 owner의 `avatar_url`을 보존하되 fake `profileUsername`을 만들지 않는지 검증.

- `src/lib/page-source-contract.test.ts`
  - project adapters가 username 조건 없이 owner avatar data를 보존하도록 고정.
  - Dashboard Recent worklogs가 `Avatar` + `adaptUser(currentUser)`를 렌더링하도록 고정.
  - Worklog Review public preview가 author avatar를 렌더링하도록 고정.
  - Project Detail owner avatar가 `profileUsername`이 있을 때만 profile link가 되도록 고정.

## Verification

- RED
  - `npm run test:contracts` 실패: `Property 'profileUsername' does not exist on type 'User'`, `Property 'id' does not exist on type 'User'`.
  - 추가 RED: project detail owner avatar가 backend id를 profile route로 링크하지 않아야 한다는 source contract 실패.

- GREEN
  - Frontend `npm run test:contracts` ✅
  - Frontend `npm run lint` ✅
  - Frontend `AGENTFEED_ALLOW_LOCAL_API_BUILD=1 NEXT_PUBLIC_API_URL=http://localhost:8000 NEXT_PUBLIC_REVIEW_BASE_URL=http://localhost:3000 npm run build` ✅

## Follow-up

> [!todo]
> 이번 범위는 “GitHub avatar가 안 보이는 표면”을 닫는 작업이다. Header, Search, Explore, Leaderboard, Worklog detail 등 profile route를 만드는 기존 코드에도 id-only user를 public username처럼 연결하지 않는 추가 hardening 여지가 있다. 기능/UX 범위가 avatar 표시보다 넓으므로 다음 별도 루프에서 다루는 것이 안전하다.

- 서버 배포는 목표 규칙에 따라 수행하지 않았다.
