---
title: Frontend Profile Mutation Public User Contract 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - backend
  - api-contract
  - public-user
  - settings
status: done
related:
  - "[[AgentFeed Current Product Brief]]"
  - "[[Frontend Public User Contract Alignment 2026-06-09]]"
  - "[[Frontend Notification Actor Public User Contract 2026-06-09]]"
---

# Frontend Profile Mutation Public User Contract 2026-06-09

> [!success] Status
> 완료. Backend `PATCH /me/profile` 응답 모델이 `DataResponse[PublicUser]` 인데 Frontend가 basic `ApiUser` 로 파싱하던 계약 drift를 수정했다.

## 근거

- Backend: `agentfeed-backend/app/routers/me.py`
  - `@router.patch("/profile", response_model=DataResponse[PublicUser])`
  - return: `{"data": _build_public_user(current_user)}`
- Backend: `agentfeed-backend/app/schemas/user.py`
  - `PublicUser` 는 basic user fields 외에 `stats: UserPublicStats | None`, `viewer_state: UserViewerState | None` 를 포함한다.
- Frontend 기존 상태:
  - `src/lib/api.ts` 의 `normalizeProfileMutationResponse()` 가 `ApiUser` 를 반환하고 `normalizeUserForContract()` 를 사용했다.
  - 이러면 Backend가 보내는 `stats`, `viewer_state` 를 unexpected key로 보거나, 계약상 중요한 public metadata를 보존하지 못한다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeProfileMutationResponse(value): ApiUserPublic`
  - parser를 `normalizePublicUserForContract(value, 'profile response', profileMutationContractError)` 로 변경.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - `me.updateProfile` fixture에 Backend raw `PublicUser.stats` 및 `viewer_state` 추가.
  - mutation 응답에서 normalized `public_worklog_count` 와 `viewer_state.following` 보존 검증 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - profile mutation normalizer가 shared `PublicUser` parser를 사용해야 한다는 source guard 추가.

## 검증

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts src/lib/settings-profile-save.contract.test.ts
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

- [ ] `PublicUser` 응답을 받는 mutation 경로가 추가되면 `normalizePublicUserForContract()` 를 우선 사용한다.
- [ ] Settings profile 저장 후 AppContext refresh가 `ApiUserPublic` 추가 필드를 UI 상태에 활용하거나 명시적으로 무시하는지 추후 UX audit에서 확인한다.
- [ ] Dev OpenAPI nested schema classification이 `/me/profile` mutation response의 PublicUser parser까지 추적하는지 보강 여지를 검토한다.
