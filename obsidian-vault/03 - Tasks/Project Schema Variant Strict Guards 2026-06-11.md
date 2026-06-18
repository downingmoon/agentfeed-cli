---
title: Project Schema Variant Strict Guards
date: 2026-06-11
tags:
  - agentfeed
  - contract
  - frontend
  - backend
status: done
---

# Project Schema Variant Strict Guards

## 배경

Backend는 Project 계열 응답을 용도별 schema로 분리하고 모두 `extra="forbid"`로 제한한다.

- `ProjectSummary`: `id`, `name`, `slug`, `visibility`
- `UserProjectSummary`: `id`, `name`, `slug`, `description`, `visibility`, `owner`, `tags`, `last_worklog_at`
- `ProjectResponse`: full project fields + `owner` + `stats`
- `ProjectSearchResult`: `id`, `name`, `slug`, `description`, `visibility`, `owner`

Frontend는 일부 경로에서 ProjectResponse에 가까운 broad allowlist를 Worklog 중첩 project와 `/users/{username}/projects`에도 재사용하고 있었다. 이 때문에 Backend가 거부하는 `owner_id`, `owner`, `stats` 같은 필드가 Frontend boundary에서는 유효한 것처럼 통과할 수 있었다.

## 변경

- WorklogCard / WorklogDetail 중첩 `project`는 Backend `ProjectSummary` 필드만 허용하도록 변경했다.
- `/users/{username}/projects`는 Backend `UserProjectSummary` 필드만 허용하도록 별도 list normalizer를 추가했다.
- `/projects`와 project detail은 기존 `ProjectResponse` normalizer 경로를 유지하되 명시적으로 분리했다.
- 기존 정상 fixture 중 WorklogCard 중첩 project에 섞여 있던 `tags`, `last_worklog_at`, `stats`, `owner`, `description`을 Backend `ProjectSummary` 기준으로 정정했다.
- `project-schema-variants-strict-fields.contract.test.ts`를 추가해 다음을 고정했다.
- 2026-06-18 [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]]에서 runner-owned valid preservation assertion flow를 `project-schema-variant-strict-field-assertions.ts`로 이동했다.
  - `users.projects`는 `UserProjectSummary`를 보존한다.
  - `users.projects`는 `owner_id`, `stats`가 섞인 ProjectResponse형 payload를 거부한다.
  - `worklogs.get`의 중첩 `project`는 `ProjectSummary`를 보존한다.
  - `worklogs.get`의 중첩 `project`는 `owner`, `stats`를 거부한다.

## 검증

- Frontend: `npm run test:contracts`
- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_public_schema_response_model_contracts.py tests/test_route_response_model_contracts.py tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py`
- CLI: `npm test -- tests/api-client-json-boundary.test.ts`

LSP diagnostics는 로컬 `typescript-language-server` 미설치로 실행되지 않았다. 타입 검증 근거는 Frontend `tsc --noEmit` 결과를 사용했다.

## LOC / 구조 메모

- `src/lib/api-project-summary.ts`: 205 pure LOC
- 신규 `src/lib/project-schema-variants-strict-fields.contract.test.ts`: originally 130 pure LOC; later split to 5 pure LOC runner plus 50 pure LOC assertion helper in [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]]

> [!warning]
> `api-project-summary.ts`가 200 LOC warning band에 들어왔다. 다음 Project contract 작업에서 이 파일에 의미 있는 로직을 더 추가해야 한다면 `api-project-stats.ts`, `api-project-summary-variants.ts`처럼 책임별 분리를 먼저 검토한다.

## 후속 과제

- [x] Valid schema variant preservation assertion flow moved in [[Frontend Project Schema Variant Strict Assertion Move 2026-06-18]].
- `ProjectResponse` read normalizer가 Backend required fields(`created_at`, `updated_at`, `owner_id` 등)를 충분히 강제하는지 별도 슬라이스로 검증한다.
- 기존 `api-contract.test.ts`는 5,000 LOC 이상이므로, 추가 계약 테스트는 가능한 한 별도 focused contract file로 분리한다.
