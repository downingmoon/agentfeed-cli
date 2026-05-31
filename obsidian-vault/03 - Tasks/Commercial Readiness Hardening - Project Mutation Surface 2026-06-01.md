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
- Backend `PATCH`가 `null` clear를 무시하는 현재 계약을 UI에서 숨기지 않도록, 기존 optional field를 빈 값으로 지우는 시도는 명시적으로 막았습니다.
- Dev OpenAPI gate에서 project mutation 3개 endpoint를 frontend client contract로 승격했습니다.

## 계약 기준

> [!important]
> 이번 변경도 [[Integration - CLI Backend Frontend#계약 기준|Database column name → Backend → Frontend → CLI]] 순서를 따릅니다. Frontend form field는 Backend `CreateProjectRequest` / `UpdateProjectRequest`의 `name`, `description`, `visibility`, `repository_url`, `homepage_url`, `tags`를 그대로 사용합니다.

## 검증

- `npm run test:contracts` in `agentfeed-frontend` → passed
- `npm run lint` in `agentfeed-frontend` → passed
- `node scripts/check-openapi-contract.mjs` in `agentfeed-dev` → passed (`client contracts: 66`, backend-only: `2`)
- `make test` in `agentfeed-dev` → passed

## 남은 리스크

> [!warning]
> Backend project update가 `body.model_dump(exclude_none=True)`를 사용하므로 description/repository/homepage를 `null`로 clear하는 UX는 아직 제공하지 않습니다. 실제 clear 기능이 필요하면 Backend update semantics부터 별도 설계해야 합니다.

## 관련 링크

- [[Integration - CLI Backend Frontend#2026-06-01 Project mutation surface]]
- [[Commercial Readiness Hardening - Cross Repo OpenAPI Contract Gate 2026-05-31]]
- [[Active Tasks#P1 후보]]
