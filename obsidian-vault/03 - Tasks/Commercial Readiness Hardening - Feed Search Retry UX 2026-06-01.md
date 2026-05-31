---
title: Commercial Readiness Hardening - Feed Search Retry UX 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Feed Search retry UX hardening
---

# Commercial Readiness Hardening - Feed Search Retry UX 2026-06-01

> [!success]
> Public Feed와 Search가 API 일시 장애에서 막힌 화면으로 끝나지 않고, 현재 필터/검색 조건을 유지한 채 사용자가 다시 시도할 수 있게 됐습니다.

## 결과

- Feed initial load 실패 시 현재 `sort`, `time_range`, `agent`, `category`, `tag` 조건을 유지하는 `retryFeed()` action을 제공합니다.
- Feed load-more 실패 시 기존 worklog 목록을 유지하고 실패한 cursor에 대한 retry CTA 하나만 표시합니다.
- Search initial load 실패 시 현재 query/filter URL state를 바꾸지 않고 `retrySearch()`로 다시 요청합니다.
- Search load-more 실패 시 기존 검색 결과를 유지하고, 일반 Load more CTA와 retry CTA가 중복 렌더링되지 않습니다.
- 사용자-facing copy에서 raw API error detail 대신 복구 가능한 행동을 안내합니다.

## Product contract

> [!important]
> Public discovery 화면은 transient API failure를 dead-end로 만들면 안 됩니다. Retry는 현재 사용자의 context를 보존해야 하며, load-more failure는 이미 렌더링된 결과를 blanking하면 안 됩니다.

## 변경 파일

- Frontend: `src/hooks/useFeed.ts`
- Frontend: `src/components/pages/FeedPage.tsx`
- Frontend: `src/components/pages/SearchPage.tsx`
- Frontend contract tests: `src/lib/page-source-contract.test.ts`

## 검증

- `npm run test:contracts` — passed
- `npx tsc --noEmit` — passed
- `npm run lint` — passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` — passed
- `agentfeed-dev make test` — passed
  - CLI: 252 tests passed, typecheck, prepack, npm audit
  - Frontend: contract tests, npm audit, production build
  - Backend: ruff, 219 tests passed, Alembic offline migration chain
- Parallel code-review agent found duplicate load-more CTA risk; patch hides normal load-more while retry state is visible.

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Feed Search retry UX]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01]]
- [[Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01]]
