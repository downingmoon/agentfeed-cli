---
title: Frontend Profile Prompt Avatar Coverage 2026-06-08
aliases:
  - Profile prompt GitHub avatar coverage
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/avatar
  - agentfeed/verification
updated: 2026-06-08
---

# Frontend Profile Prompt Avatar Coverage 2026-06-08

## 결론

Profile의 `Prompts` 탭은 사용자가 올린 공개 worklog/prompt를 보여주는 표면인데, 기존에는 작성자 GitHub profile image 없이 `PROMPT · n` 텍스트와 메타 아이콘만 렌더링했다. 최신 소스 기준으로 이 탭에도 profile owner avatar를 표시하도록 보강했다.

## 변경

- `src/components/pages/ProfilePage.tsx`
  - `prompts.map(...)` 카드 헤더에 `<Avatar user={user} size="sm" initials={user.username.slice(0, 2)} />` 추가.
  - prompt 카드가 profile owner의 `avatar_url` 또는 trusted GitHub avatar fallback을 그대로 사용한다.
- `src/lib/page-source-contract.test.ts`
  - Profile prompt 카드가 text-only row로 회귀하지 않도록 source contract 추가.

## 점검 결과

> [!success]
> Feed card, Worklog detail author, Worklog comments, Search prompts, Explore builders/projects, Leaderboard, Notifications, Project owner, Settings/Header, Worklog Review preview는 이미 shared `Avatar` + `adaptUser`/`adaptWorklogCard` 경로로 GitHub avatar를 보존하고 있었다.

> [!note]
> Backend의 public user serializer `_build_public_user()`는 `avatar_url`과 `github_url`을 포함한다. Frontend `adaptUser()`는 `avatar_url`이 없고 trusted `github_url`만 있는 경우 `https://github.com/{username}.png?size=96` fallback을 만든다.

## 검증

- Frontend: `npm run test:contracts && npm run lint` 통과.
- Backend: `uv run pytest && uv run ruff check .` 통과 (`400 passed`, ruff 통과).
- CLI: `npm run release:preflight` 통과 (`27 test files`, `562 passed`).

## 후행 과제

- [ ] 개인서버 배포 후 `/profile/{username}?tab=prompts` 또는 UI 탭 전환으로 실제 hosted 화면에서 GitHub avatar 표시를 smoke 확인한다.
