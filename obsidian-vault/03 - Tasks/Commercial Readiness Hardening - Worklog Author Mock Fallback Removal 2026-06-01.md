---
title: Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01
aliases:
  - Worklog Author Mock Fallback Removal
  - Worklog Author Identity Contract
status: done
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - Worklog Author Mock Fallback Removal 2026-06-01

## 결과

> [!success]
> Worklog card author 표시가 더 이상 `src/lib/data.ts`의 static mock user map으로 fallback하지 않습니다. Backend adapter가 제공한 `_author`를 우선 사용하고, 정말 author payload가 없는 경우에는 username 기반 generic identity만 표시합니다.

## 변경 요약

- `src/components/worklog/worklogAuthor.ts`에서 `USERS` import와 `USERS[worklog.author]` fallback을 제거했습니다.
- `_author`가 있을 때만 Backend-normalized author name/avatar metadata를 사용합니다.
- `_author`가 없으면 `worklog.author` username을 그대로 이름/username으로 쓰는 generic fallback을 생성합니다.
- Generic fallback avatar color는 username hash 기반 deterministic palette로 생성합니다.
- `page-source-contract.test.ts`가 static mock user import/fallback 금지와 `_author` 우선 계약을 고정합니다.

## 계약 기준

> [!important]
> Public worklog cards의 author metadata는 Backend response → adapter `_author` → card 순서로 흘러야 합니다. Frontend static demo users는 production user identity fallback으로 쓰면 안 됩니다.

> [!note]
> 이 변경은 Landing page의 demo data 제거와는 별도입니다. Landing mock demo 제거는 후속 slice로 남아 있습니다.

## 검증

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build` in `agentfeed-frontend` → passed
- `make test` in `agentfeed-dev` → passed (CLI 252 tests/prepack/audit, Frontend contracts/build/audit, Backend 219 tests + Alembic offline chain)

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Worklog author mock fallback removal]]
- [[Active Tasks#P1 후보]]
