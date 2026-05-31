---
title: Public Activity Tab
aliases:
  - Profile Public Activity
  - User Activity Frontend Surface
author: AgentFeed automation
created: 2026-06-01
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/api
  - agentfeed/integration
status: done
---

# Public Activity Tab

## 목표

Backend의 `GET /v1/users/{username}/activity` 계약을 Frontend Profile page에 연결해, 사용자 public activity endpoint가 더 이상 backend-only product gap이 아니도록 했습니다.

> [!important]
> Activity payload 기준은 Backend `UserActivityResponse`입니다. Frontend는 `from`, `to`, `days[].sessions`, `days[].tokens_used`, `days[].public_worklogs` 필드 이름을 그대로 사용합니다.

## 구현 요약

Frontend:

- `ApiUserActivityDay`, `ApiUserActivity` 타입을 추가했습니다.
- `users.activity(username, { from, to })` helper를 추가했습니다.
- Profile page가 `users.get(username)`을 primary request로 유지한 뒤, worklogs/projects/activity를 `Promise.allSettled`로 secondary fetch합니다.
- Activity fetch 실패는 `activityError`로 section-level 표시하고 profile header/worklogs/projects를 blank하지 않습니다.
- Profile tab에 `Activity`를 추가하고 90일 기본 activity summary와 day bars를 표시합니다.
- `tokens_used = null`인 경우 privacy setting에 의해 hidden임을 UI에 명시합니다.

Dev gate:

- `agentfeed-dev/scripts/check-openapi-contract.mjs`에서 `/v1/users/{username}/activity`를 Frontend client contract로 승격했습니다.
- backend-only 분류에서 public activity endpoint를 제거했습니다.

## 검증 증거

- Frontend contract:
  - `npm run test:contracts` in `agentfeed-frontend` → pass
- Frontend typecheck/lint:
  - `npm run lint` in `agentfeed-frontend` → pass
- Dev OpenAPI gate:
  - `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → pass
  - Client contracts checked: 63 (`cli: 6`, `frontend: 57`)
  - Classified backend-only operations: 5

## 남은 Backend-only product gap

> [!todo]
> 이번 작업으로 public activity endpoint는 product gap에서 제거됐습니다. 남은 P1은 project create/edit/delete UI입니다.

- Project create/edit/delete UI

## 다음 작업 메모

[[Commercial Readiness Hardening - Report Actions Surface 2026-06-01]] 이후 남은 frontend-backend 불일치는 project mutation surface입니다. 병렬 evidence lane 결과에 따르면 Backend mutation 계약은 `POST /v1/projects`, `PATCH /v1/projects/{project_id}`, `DELETE /v1/projects/{project_id}`이고, Frontend는 API helpers와 owner-gated create/edit/delete UX가 아직 없습니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Public activity tab]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]
