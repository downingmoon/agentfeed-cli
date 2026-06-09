---
title: Frontend Nested Public User Contract Alignment 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - frontend
  - backend
  - contract
  - public-user
  - verification
status: completed
related:
  - "[[Frontend Public User Contract Alignment 2026-06-09]]"
  - "[[Frontend User Response Extra Field Guard 2026-06-09]]"
---

# Frontend Nested Public User Contract Alignment 2026-06-09

> [!success] 완료
> Backend schema가 `PublicUser`로 선언한 nested user payload들을 Frontend API boundary에서도 모두 `PublicUser`로 파싱하도록 정렬했다.

## 배경

이전 pass에서 `WorklogCard.author`, `WorklogDetail.author`, `Explore.rising_builders`의 `PublicUser` 계약 불일치를 수정했다. 이어서 Backend schema를 재확인한 결과 다음 nested payload들도 `PublicUser`인데 Frontend 일부 parser는 기본 `User`로 좁게 파싱하고 있었다.

- `Comment.author`
- `SearchResponse.users[]`
- `SearchPromptResult.author`
- `SearchProjectResult.owner`
- `Explore.popular_prompts[].author`
- `Explore.trending_projects[].owner`
- `ProjectSummary.owner`
- `ProjectMutationResponse.owner`

Backend `PublicUser`는 `stats`, `viewer_state`를 포함할 수 있으므로, Frontend가 이를 unexpected field로 거부하면 실제 배포 데이터와 contract gate가 어긋날 수 있다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - nested user 타입을 `ApiUserPublic`로 정렬.
  - comment/search/explore/project owner/author parser를 `normalizePublicUserForContract()`로 통일.
  - 기본 `User`로 남아야 하는 `auth.me` 등은 기존 좁은 parser 유지.
- `agentfeed-frontend/src/lib/adapters.ts`
  - UI adapter가 이미 검증된 `PublicUser`의 `stats`, `viewer_state` 추가 필드를 허용하도록 정렬.
  - adapter는 렌더링에 필요한 기본 user identity만 사용한다.
- `agentfeed-frontend/src/lib/comment-adapter.ts`
  - comment row fallback adapter도 `ApiUserPublic` shape를 반환하도록 보강.
  - `stats`, `viewer_state`가 있으면 검증하고, 없으면 안전한 빈 public stats로 정규화.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - comment author의 Backend `PublicUser.stats/viewer_state` 보존 테스트 추가.
  - malformed public author stats fail-closed 테스트 추가.
  - project owner fixtures를 `PublicUser` shape로 정렬.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - PublicUser가 필요한 nested parser 호출을 source contract로 고정.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm test -- --run src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts
# passed

npm test
# passed

npm run lint
# tsc --noEmit passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 \
npm run build
# Next.js production build passed

NEXT_PUBLIC_API_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
npm run check:api-compatibility
# FRONTEND_API_COMPATIBILITY_PASSED v1 2026-06-03

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
```

## 배포

서버 배포는 goal 필수 규칙에 따라 실시하지 않았다.

## 후행 과제

- [ ] Backend `PublicUser` schema 변경 시 `normalizePublicUserForContract()`, adapter allowlist, source contract를 같은 PR/pass에서 갱신한다.
- [ ] notification `actor: PublicUser | None` 렌더링/adapter 경로도 다음 contract audit에서 별도 확인한다.
- [ ] Dev OpenAPI gate가 nested `PublicUser` usage를 자동 분류해 Frontend parser drift를 더 직접적으로 잡을 수 있는지 검토한다.
