---
title: Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Landing API-backed preview hardening
---

# Commercial Readiness Hardening - Landing API Backed Preview 2026-06-01

> [!success]
> Landing hero preview가 더 이상 static `WORKLOGS[0]` / `USERS` fixture를 실제 제품 카드처럼 보여주지 않습니다. 공개 Explore/Feed API에서 가져온 worklog만 대표 카드로 표시하고, 데이터가 없거나 API가 실패하면 안전한 fallback으로 전환합니다.

## 결과

- Frontend landing hero preview가 `explore.get()`의 `trending_worklogs`를 우선 사용합니다.
- Explore 결과가 비어 있으면 `feed.list({ sort: 'trending', time_range: 'all', limit: 1 })`로 fallback합니다.
- API 응답은 `adaptWorklogCards()`를 통해 기존 worklog card 모델로 정규화합니다.
- 로딩 중 skeleton card를 표시합니다.
- public worklog가 없거나 API 실패 시 `/feed`로 안내하는 empty/error card를 표시합니다.
- share/comment/title link는 실제 preview worklog URL 또는 `/feed` fallback만 사용합니다.

## Product contract

> [!important]
> Production landing page의 핵심 worklog preview는 static demo worklog를 실제 데이터처럼 노출하면 안 됩니다. fixture는 sample-only로 명확히 라벨링된 영역에만 허용합니다.

허용되는 static data:

- `AGENTS` 기반 지원 에이전트 스트립처럼 제품 설명용 정적 목록.

금지되는 static data:

- `WORKLOGS[0]` 같은 local fixture를 live public worklog처럼 렌더링.
- `USERS[...]` mock author를 API-backed author identity처럼 렌더링.

## 변경 파일

- Frontend: `src/components/pages/LandingPage.tsx`
- Frontend contract tests: `src/lib/page-source-contract.test.ts`

## 검증

- `npm run test:contracts` — passed
- `npm run lint` — passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` — passed
- `agentfeed-dev make test` — passed
  - CLI: 252 tests passed, typecheck, prepack, npm audit
  - Frontend: contract tests, npm audit, production build
  - Backend: ruff, 219 tests passed, Alembic offline migration chain

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Landing API-backed preview]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01]]
- [[Commercial Readiness Hardening - Feed Tag Filter Contract 2026-06-01]]
