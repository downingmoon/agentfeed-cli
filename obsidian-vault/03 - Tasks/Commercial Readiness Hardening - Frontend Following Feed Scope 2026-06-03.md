---
title: Commercial Readiness Hardening - Frontend Following Feed Scope 2026-06-03
aliases:
  - Frontend Following Feed Scope
  - Feed Following Tab
created: 2026-06-03
updated: 2026-06-03
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/feed
  - agentfeed/integration
---

# Frontend Following Feed Scope

> [!summary]
> Backend `GET /v1/feed/following`와 Frontend `feed.following()` wrapper가 있었지만 Feed UI는 public feed만 호출했습니다. `/feed?scope=following`을 shareable UI state로 추가해 팔로우한 builder의 공개 worklog를 실제 following endpoint로 조회하도록 연결했습니다.

## Risk

- `feed.following()` dead code 상태는 Backend API가 있어도 사용자가 Following feed를 발견하거나 검증할 수 없게 만듭니다.
- Signed-out 사용자가 following endpoint를 직접 호출하면 401 오류 UI로 보일 수 있어, product UX와 API noise가 모두 나빠집니다.
- OAuth `next` sanitizer가 `/feed`의 `tag`/`scope` query를 보존하지 않으면 로그인 후 shareable feed context가 사라집니다.

## Changes

- `agentfeed-frontend/src/components/pages/FeedPage.tsx`
  - Public / Following scope switch 추가.
  - `/feed?scope=following` URL hydration + URL sync 추가.
  - Following scope에서는 Backend가 지원하는 `sort`/`tag`/`cursor`/`limit`만 사용하고 public-only `agent/category/time_range`는 전송하지 않음.
  - Signed-out following scope는 API 호출 대신 GitHub login CTA를 표시.
- `agentfeed-frontend/src/hooks/useFeed.ts`
  - `scope`와 `enabled` 옵션을 받아 public feed와 following feed request를 선택.
  - load-more와 abort behavior를 selected endpoint로 유지.
- `agentfeed-frontend/src/lib/feed-filters.ts`
  - `FeedScope`, `feedScopeFromParam`, following scope query serialization 추가.
- `agentfeed-frontend/src/lib/auth-next.ts`
  - OAuth next allowlist에 `/feed` `scope`/`tag` 보존 추가.
- Contract tests updated to lock the API call path, URL serialization, source contracts, and OAuth next behavior.

## Verification

- `npm run test:contracts` → passed.
- `npm run lint` → `tsc --noEmit` passed.
- `npm run build` without `NEXT_PUBLIC_API_URL` → failed closed as expected.
- `NEXT_PUBLIC_API_URL=http://127.0.0.1:8001 npm run build` → failed closed as expected because production builds reject localhost API URLs.
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed.
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → failed at hosted production compatibility because `api.agentfeed.dev` DNS is unresolved (known external blocker).
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` → passed.
- `agentfeed-dev ./scripts/test-all.sh` → passed across dev gates, CLI release preflight, Frontend CI, Backend lint/tests/migrations, and OpenAPI/client contract gates.
- GitHub Actions Frontend CI `26863429918` → failed only at hosted readiness preflight after typecheck, audit, contract tests, and mock API compatibility passed; blocker remains `api.agentfeed.dev` DNS `ENOTFOUND` and `https://agentfeed.dev/` root `307 /login`.
- GitHub Actions CLI CI `26863437648` → passed.
- Browser smoke: `http://127.0.0.1:3015/feed?scope=following&tag=cli%2Frelease` rendered `Following Feed`, selected `Following`, preserved tag `#cli/release`, and displayed signed-out login CTA without calling `/v1/feed/following`; only metadata failed due the known `api.agentfeed.dev` DNS blocker.

## Related

- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Frontend Hosted Readiness Preflight 2026-06-03]]
