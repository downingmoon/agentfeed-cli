---
title: Project Owner Public Handle Display Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - quality-pass
status: done
aliases:
  - Project Owner Handle Guard
---

# Project Owner Public Handle Display Guard 2026-06-09

> [!success] Result
> 프로젝트 owner에 `profileUsername: null`이 내려오는 경우에도 Frontend가 backend 내부 id를 `@handle`처럼 렌더링하지 않도록 표시 경로를 고정했다.

## 배경

- 이전 pass에서 worklog/user 중심의 공개 handle 표시를 보강했다: [[User Public Handle Display Guard 2026-06-09]].
- 추가 점검 중 project 카드/검색/탐색/detail 일부가 `project.owner`, `ownerUser.username`, 또는 slice 기반 fallback을 직접 사용하고 있었다.
- Adapter는 owner GitHub avatar를 보존하기 위해 `ownerUser`를 유지해야 하므로, UI에서 public handle과 backend identity를 분리해야 한다.

## 변경 범위

- `agentfeed-frontend/src/components/pages/ProjectsPage.tsx`
  - 프로젝트 카드 owner 표시를 `userHandleLabel(p.ownerUser)`로 통일.
  - owner avatar initials를 `userInitialsSeed(p.ownerUser)`로 통일.
- `agentfeed-frontend/src/components/pages/ProfilePage.tsx`
  - 프로필 내 프로젝트 카드에서 `@{p.owner || user.username}` 직접 표시 제거.
  - `ownerUser = p.ownerUser ?? user`를 기준으로 avatar/label을 렌더링.
- `agentfeed-frontend/src/components/pages/SearchPage.tsx`
  - 프로젝트 검색 결과에서 owner label을 공유 helper로 렌더링.
- `agentfeed-frontend/src/components/pages/ExplorePage.tsx`
  - trending project owner avatar initials를 공유 helper로 렌더링.
- `agentfeed-frontend/src/components/pages/ProjectDetailPage.tsx`
  - owner avatar initials를 공유 helper로 렌더링.
  - 공개 username이 없는 owner는 링크 없이 display name만 보여주는 기존 정책 유지.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - id-only owner fixture가 `Owner Without Username`으로 표시되고 backend id를 `@handle`로 만들지 않는 계약 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - project owner 표시 surface들이 `userHandleLabel`/`userInitialsSeed`를 쓰도록 source contract 보강.

## 검증

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run check:api-compatibility:mock`
- [x] `AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 NEXT_PUBLIC_API_URL=https://api.agentfeed.dev NEXT_PUBLIC_REVIEW_BASE_URL=https://agentfeed.dev npm run ci`
- [x] `node scripts/check-openapi-contract.mjs` in `agentfeed-dev`

## 배포

> [!success]
> 사용자가 이번 turn에서 개인서버 배포 1회를 요청했고, `agentfeed-dev`의 server deploy 경로로 배포를 완료했다.
>
> - `make server-up`
> - `ssh trading-bot 'cd ~/agentfeed/agentfeed-dev && docker compose --env-file .env up -d --force-recreate frontend'`
> - frontend health: `healthy`
> - `AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 AGENTFEED_ALLOW_INSECURE_API=1 NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 make smoke-hosted-compatibility` → `HOSTED_COMPATIBILITY_SMOKE_PASSED`
> - 원격 소스 확인: `ProjectsPage.tsx`/`SearchPage.tsx`에 `ownerLabel = ... userHandleLabel(...)` 반영됨.

## 남은 확인

- [ ] 실제 개인서버 화면에서 id-only owner fixture를 만들 수 있는 seed가 있으면 `/projects`, `/search`, `/explore`, `/projects/[slug]` 시각 확인.
- [ ] `userInitialsSeed()`가 `profileUsername: null`일 때 initials seed로 backend id를 계속 쓰는 정책이 적절한지 후속 UX 결정 필요.
