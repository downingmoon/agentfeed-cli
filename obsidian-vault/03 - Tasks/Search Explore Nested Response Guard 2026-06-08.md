---
title: Search Explore Nested Response Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - search
  - explore
---

# Search Explore Nested Response Guard 2026-06-08

## 결론

`search.query`와 `explore.get`이 nested arrays를 raw typed response로 신뢰하던 부분을 Frontend API boundary에서 fail-closed 처리했다. Search/Explore는 discovery surface라 worklog card, project, user, prompt, category payload가 한 응답 안에 섞이며, 하나라도 계약과 다르면 UI가 잘못된 링크/프로필/metric evidence를 렌더링할 수 있다.

> [!success] 완료
> Search/Explore 응답의 nested worklog/project/user/prompt/builder/category row가 계약과 다르면 Frontend가 502 contract mismatch로 중단한다. 공용 WorklogCard row는 [[Worklog Card List Response Guard 2026-06-08]]의 guard를 재사용한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeSearchResponse` 추가.
  - search nested `worklogs`, `users`, `projects`, `prompts`, `pagination` 검증.
  - `normalizeExploreSection` 추가.
  - explore nested `trending_worklogs`, `trending_projects`, `popular_prompts`, `rising_builders`, `featured_categories` 검증.
  - Backend schema에 맞춰 `ApiExploreSection.featured_categories[].slug`를 `string | null`로 정정.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid search/explore nested payload preserve 테스트 추가.
  - malformed nested worklog, prompt author, project tags, trending project owner, popular prompt count, rising builder count, featured category count rejection 추가.
  - 기존 URL/method contract mock도 실제 `/search` response envelope에 맞게 수정.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- TypeScript targeted check: 통과.
- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- Dev OpenAPI contract gate: 통과, operations 75 / frontend client contracts 63 / schema field contracts 175.

## 후행 과제

- `users.activity`, `moderation.listReports`, `dashboard.summary/recent-worklogs`, `notifications.list` read/list payload fail-safe audit.
- Search suggestions와 Explore tags response도 item-level guard 대상으로 남겨둘지 검토.
- Search/Explore nested guard와 Dev OpenAPI field gate coverage가 같은 schema drift를 잡는지 추가 field coverage 검토.
