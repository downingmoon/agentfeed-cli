---
title: Frontend Social Response Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/social
  - project/tasks
aliases:
  - Social Action Response Guard
---

# Frontend Social Response Guard 2026-06-08

## 결론

Frontend optimistic UI가 like/bookmark/follow mutation의 `200 OK` 응답을 그대로 신뢰하지 않도록 **runtime response guard**를 추가했다. Backend schema 기준은 다음과 같다.

- `LikeResponse`: `liked`, `likes_count`
- `BookmarkResponse`: `bookmarked`, `bookmarks_count`
- `FollowResponse`: `following`, `followers_count`

> [!success]
> 이제 malformed social/follow 응답은 UI state에 `undefined` counter를 쓰기 전에 `ApiError(502)`로 fail-closed 된다.

## 변경

### Frontend

- `src/lib/api.ts`
  - social/follow 응답 normalizer 추가.
  - `likes_count`, `bookmarks_count`, `followers_count`는 non-negative integer가 아니면 거부.
  - boolean state(`liked`, `bookmarked`, `following`)가 아니면 거부.
- `src/lib/api-contract.test.ts`
  - malformed like/bookmark/follow 응답이 `social action response contract mismatch` 진단으로 닫히는지 테스트 추가.
  - 2026-06-18 [[Frontend Social Action Response Assertion Move 2026-06-18]]에서 이 assertion flow를 `src/lib/social-action-response-assertions.ts`로 이동했다.

### Dev contract gate

- `scripts/check-openapi-contract.mjs`
  - like/unlike/bookmark/unbookmark/follow/unfollow response field contract 추가.
  - 각 응답의 boolean/count schema field contract 추가.

## GitHub profile image 재점검

이번 확인에서 user/feed/profile 관련 주요 surface는 이미 GitHub avatar를 사용하고 있었다.

- Feed worklog cards: `WorklogCardA/B/C`가 `Avatar user={u}` 사용.
- Feed sidebar trending/rising builders: hydrated author/user avatar 사용.
- Profile page: profile header와 project owner row avatar 사용.
- Search/Explore/Leaderboard/Notifications/Dashboard/Settings/CLI authorize/Worklog detail/comment surfaces: 기존 source contract와 실제 컴포넌트 기준 avatar 사용 확인.

> [!note]
> 이번 slice에서 새 avatar UI 수정은 필요하지 않았다. 대신 social/follow 응답 drift가 UI counter/feedback을 깨뜨리는 잔여 contract gap을 닫았다.

## 검증 evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint
npm run test:contracts
```

- `npm run lint`: 통과.
- `npm run test:contracts`: 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- OpenAPI operations: 75
- Client contracts: 70
- Response field contracts: 37
- Schema field contracts: 165 fields across 33 operations
- 결과: 통과.

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest -q tests/test_contracts.py -k "like_worklog or unlike_worklog or bookmark_worklog or unbookmark_worklog or follow_user or unfollow_user or route_response_models_use_explicit_contract_schemas or social_and_comment_routes_have_response_models or profile_dashboard_and_worklog_routes_have_response_models"
uv run ruff check app/schemas/social.py app/routers/social.py app/routers/users.py tests/test_contracts.py
```

- pytest: `2 passed, 370 deselected`
- ruff: `All checks passed!`

## 후행 과제

- [ ] 배포 후 개인 서버에서 feed/profile/worklog detail의 avatar rendering과 social action 버튼을 browser smoke로 확인.
- [ ] 이후 API contract gap을 찾을 때는 DB column/schema → Backend schema → Frontend normalizer/test → Dev OpenAPI gate 순서로 맞춘다.

## 관련

- [[Frontend GitHub Avatar Coverage 2026-06-08]]
- [[User Avatar Residual Coverage 2026-06-08]]
- [[Frontend Token Response Guard 2026-06-08]]
- [[Integration - CLI Backend Frontend]]
