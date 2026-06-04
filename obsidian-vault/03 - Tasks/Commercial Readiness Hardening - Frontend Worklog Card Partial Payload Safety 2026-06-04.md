---
title: Commercial Readiness Hardening - Frontend Worklog Card Partial Payload Safety 2026-06-04
aliases:
  - Frontend Worklog Card Partial Payload Safety
  - WorklogCard user project fallback
status: done
created: 2026-06-04
tags:
  - agentfeed/frontend
  - agentfeed/feed
  - agentfeed/runtime-safety
  - agentfeed/commercial-readiness
  - project/tasks
---

# Commercial Readiness Hardening - Frontend Worklog Card Partial Payload Safety 2026-06-04

## 결과

> [!success]
> Feed/worklog card variants A/B/C가 partial backend payload나 legacy normalized worklog를 받아도 `u.name` / `w.project.name` 직접 dereference로 화면 전체를 crash시키지 않도록 방어했습니다.

## 문제

- 실제 `/feed` 검증 중 `undefined is not an object (evaluating 'u.name')` 형태의 card runtime crash가 관찰된 적이 있습니다.
- Adapter는 정상 API payload를 대부분 normalize하지만, partial deploy, legacy cache, mock compatibility, dashboard saved cards 같은 경계에서는 컴포넌트 자체도 fail-soft해야 합니다.
- 기존 WorklogCard A/B/C는 `w.project.name`을 직접 읽고, author helper도 partial `_author` object를 normalize하지 않았습니다.

## 구현

- `agentfeed-frontend/src/components/worklog/worklogAuthor.ts`
  - partial `_author` object를 `normalizeAuthor()`로 runtime-safe `User` 형태로 보정.
  - author name이 없으면 username, username도 없으면 generic `unknown` fallback 사용.
  - `getWorklogProject()` helper 추가: project가 없거나 name이 비어도 slug 또는 `No project`로 fallback.
- `agentfeed-frontend/src/components/worklog/WorklogCardA.tsx`
- `agentfeed-frontend/src/components/worklog/WorklogCardB.tsx`
- `agentfeed-frontend/src/components/worklog/WorklogCardC.tsx`
  - project display를 `getWorklogProject(w)`로 통일.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - WorklogCard variants가 `w.project.name`을 직접 dereference하지 않는 계약 추가.
  - shared project fallback helper contract 추가.
- `agentfeed-frontend/src/lib/integration-contract.ts`
  - partial author/project fallback type contract 추가.

## 검증

> [!example] Targeted
> `npm run test:contracts` → passed
>
> `npm run lint` → passed

> [!success] Production build
> `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed

## 남은 리스크

> [!warning]
> 이 slice는 Frontend component-level fail-soft hardening입니다. Hosted smoke는 별도 blocker로 남아 있으며, 2026-06-04 기준 `api.agentfeed.dev` DNS와 stale hosted root deploy 문제는 아직 코드 검증만으로 해소되지 않습니다.

## 관련 링크

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Commercial Readiness Hardening - Frontend Backend Response Schema Drift Gate 2026-06-01]]
- [[Commercial Readiness Hardening - Frontend Hosted HTTPS Readiness Gate 2026-06-04]]
