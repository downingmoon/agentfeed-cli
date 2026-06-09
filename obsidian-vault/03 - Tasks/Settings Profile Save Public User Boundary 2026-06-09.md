---
title: Settings Profile Save Public User Boundary 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - settings
  - api-contract
  - public-user
status: done
related:
  - "[[Frontend Profile Mutation Public User Contract 2026-06-09]]"
  - "[[Settings Username Boundary Validation Guard 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Settings Profile Save Public User Boundary 2026-06-09

> [!success] Status
> 완료. `me.updateProfile` parser가 Backend `PublicUser` 응답으로 정렬된 뒤에도 Settings profile save helper가 `ApiUser` 로 좁게 받던 타입 경계를 `ApiUserPublic` 으로 맞췄다.

## 배경

- 이전 pass에서 `PATCH /me/profile` 응답 parser는 `ApiUserPublic` 으로 정렬되었다.
- 하지만 `src/lib/settings-profile-save.ts` 는 여전히 `updateProfile: (...) => Promise<ApiUser>` 로 선언되어 있었다.
- 이는 runtime 기능을 깨지는 않지만, Settings save boundary에서 Backend `PublicUser` metadata(`stats`, `viewer_state`)를 타입상 잃게 만들어 future refactor에서 계약 drift가 재발할 수 있다.

## 변경

- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - `ApiUser` import를 `ApiUserPublic` 으로 변경.
  - `updateProfile` option type을 `Promise<ApiUserPublic>` 으로 변경.
  - 내부 `savedProfile` 및 `patchFromSavedProfile()` parameter도 `ApiUserPublic` 으로 정렬.
- `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts`
  - profile fixture를 `ApiUserPublic` 로 변경.
  - public stats/viewer_state fixture를 추가해 helper boundary가 PublicUser shape를 받아들이도록 고정.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Settings profile save helper가 `ApiUserPublic` 및 `Promise<ApiUserPublic>` 를 유지하도록 source guard 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/settings-profile-save.contract.test.ts src/lib/page-source-contract.test.ts src/lib/api-contract.test.ts
npm test
npm run lint
NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
  NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
  NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
  npm run build
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- Targeted contract tests 통과.
- 전체 Frontend contract tests 통과.
- TypeScript `tsc --noEmit` 통과.
- Next production build 통과.
- Dev OpenAPI contract gate 통과.

## 배포

- Goal 필수 규칙 6에 따라 서버 배포는 실시하지 않았다.

## 후속 작업

- [ ] `ApiUserPublic` 를 반환하는 API client method를 helper/adapter boundary에서 다시 `ApiUser` 로 좁히는 곳이 없는지 주기적으로 재스캔한다.
- [ ] `settingsProfileFormFromUser()` 와 `SettingsProfileUserPatch` 는 의도적으로 basic profile fields만 반영한다는 점을 future UI audit에서 확인한다.
- [ ] Dev OpenAPI gate가 helper-level type narrowing까지 자동 탐지할 수 있을지 검토한다.
