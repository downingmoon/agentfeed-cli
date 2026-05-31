---
title: Report Actions Surface
aliases:
  - Worklog Comment Report UX
  - Frontend Report Actions
created: 2026-06-01
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/api
  - agentfeed/moderation
  - agentfeed/integration
status: done
---

# Report Actions Surface

## 목표

Backend에 이미 존재하던 `POST /v1/worklogs/{worklog_id}/report`, `POST /v1/comments/{comment_id}/report` 계약을 Frontend Worklog detail UX에 연결해, public content moderation 진입점을 제품 surface로 승격했습니다.

> [!important]
> Backend `ReportRequest`가 계약의 기준입니다. Frontend는 reason enum과 `description` 필드를 Backend 이름 그대로 사용하고, ID는 path segment encoding 후 전송합니다.

## 구현 요약

Frontend:

- `ApiReportReason`, `ApiReportBody` 타입을 추가했습니다.
- `social.reportWorklog()` → `POST /v1/worklogs/{worklog_id}/report` helper를 추가했습니다.
- `social.reportComment()` → `POST /v1/comments/{comment_id}/report` helper를 추가했습니다.
- `WorklogDetailPage`에 worklog report action과 comment report action을 추가했습니다.
- signed-out 사용자는 기존 auth intent 경로인 `redirectToSignInForCurrentRoute()`로 보냅니다.
- report form은 Backend enum reason, optional details, pending lock, success/error 상태를 갖습니다.
- 자기 worklog/comment에 대한 불필요한 report affordance는 최소화했습니다.

Dev gate:

- `agentfeed-dev/scripts/check-openapi-contract.mjs`에서 report endpoints를 Frontend client contract로 승격했습니다.
- backend-only 분류에서 comment/worklog report endpoints를 제거했습니다.

## 검증 증거

- Frontend contract:
  - `npm run test:contracts` in `agentfeed-frontend` → pass
- Frontend typecheck/lint:
  - `npx tsc --noEmit` in `agentfeed-frontend` → pass
  - `npm run lint` in `agentfeed-frontend` → pass
- Dev OpenAPI gate:
  - `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → pass
  - Client contracts checked: 62 (`cli: 6`, `frontend: 56`)
  - Classified backend-only operations: 6

## 남은 Backend-only product gap

> [!todo]
> 이번 작업으로 report actions는 product gap에서 제거됐습니다. 남은 P1 항목은 project mutations와 public activity입니다.

- Project create/edit/delete UI
- User public activity tab

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Report actions surface]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]
