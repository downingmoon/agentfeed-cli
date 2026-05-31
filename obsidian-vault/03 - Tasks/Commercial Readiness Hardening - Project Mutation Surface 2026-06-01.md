---
title: Commercial Readiness Hardening - Project Mutation Surface 2026-06-01
aliases:
  - Project Mutation Surface
  - Frontend Project Create Edit Delete
status: done
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/integration
  - agentfeed/commercial-readiness
---

# Commercial Readiness Hardening - Project Mutation Surface 2026-06-01

## 결과

> [!success]
> Backend의 project mutation API(`POST /v1/projects`, `PATCH /v1/projects/{project_id}`, `DELETE /v1/projects/{project_id}`)가 Frontend Projects/Project Detail 관리 surface와 dev OpenAPI client gate에 연결되었습니다.

## 변경 요약

- Frontend `projects.create()`, `projects.update()`, `projects.delete()` API helper를 추가했습니다.
- `/projects` 목록 화면에서 로그인 사용자가 project를 생성하고 생성 결과를 owner-aware route로 이동할 수 있게 했습니다.
- Project detail 화면에서 owner만 edit/delete control을 볼 수 있게 했습니다.
- Project edit은 Backend project id 기준으로 `PATCH /v1/projects/{project_id}`를 호출합니다.
- Project delete는 project name 입력 confirmation 후 `DELETE /v1/projects/{project_id}`를 호출하고 `/projects`로 이동합니다.
- 초기 연결 당시 Backend `PATCH`의 `null` clear 미지원은 UI guard로 막았고, 후속 [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]에서 Backend/Frontend clear 계약까지 정렬했습니다.
- Dev OpenAPI gate에서 project mutation 3개 endpoint를 frontend client contract로 승격했습니다.

## 계약 기준

> [!important]
> 이번 변경도 [[Integration - CLI Backend Frontend#계약 기준|Database column name → Backend → Frontend → CLI]] 순서를 따릅니다. Frontend form field는 Backend `CreateProjectRequest` / `UpdateProjectRequest`의 `name`, `description`, `visibility`, `repository_url`, `homepage_url`, `tags`를 그대로 사용합니다.

## 검증

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed (`client contracts: 66`, backend-only: `2`)
- `make test` in `agentfeed-dev` → passed

## 후속 정리

> [!success]
> 기존 남은 리스크였던 nullable field clear UX는 [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]에서 해결되었습니다.

## 관련 링크

- [[Commercial Readiness Hardening - Project Nullable Field Clear Semantics 2026-06-01]]
- [[Integration - CLI Backend Frontend#2026-06-01 Project mutation surface]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]
