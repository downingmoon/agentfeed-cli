---
title: Project Response Required Fields Guard
date: 2026-06-11
tags:
  - agentfeed
  - contract
  - frontend
  - backend
status: done
---

# Project Response Required Fields Guard

## 배경

Backend `ProjectResponse`는 `Project`를 상속하며 `/projects`, `/projects/{id}`, project mutation 응답에서 full project payload를 반환한다. 실제 router `_project_dict`는 다음 ProjectResponse 필드를 항상 구성한다.

- `id`
- `owner_id`
- `name`
- `slug`
- `description`
- `visibility`
- `repository_url`
- `homepage_url`
- `tags`
- `created_at`
- `updated_at`
- `owner` / `stats`는 호출 경로에 따라 포함 가능

Frontend ProjectResponse read normalizer는 기존에 broad allowlist만 확인하고 `owner_id`, `slug`, `tags`, `created_at`, `updated_at`의 존재/형식을 충분히 강제하지 않았다. 이 경우 `/projects` 응답이 `UserProjectSummary`처럼 축소되어도 UI 경계에서 통과할 수 있었다.

## 변경

- ProjectStats normalizer를 `src/lib/api-project-stats.ts`로 분리했다.
  - `src/lib/api-project-summary.ts`가 200 LOC warning band를 넘지 않도록 책임을 분리했다.
- ProjectResponse read normalizer가 다음을 필수 검증하도록 강화했다.
  - `owner_id`: non-empty string
  - `slug`: non-empty string
  - `tags`: string array
  - `created_at`: ISO date string
  - `updated_at`: ISO date string
  - `repository_url`, `homepage_url`: nullable string
- source-contract를 새 `api-project-stats.ts` 위치에 맞게 갱신했다.
- 기존 Frontend contract fixture 중 `/projects` 응답에 `UserProjectSummary` shape를 쓰던 부분을 `ProjectResponse` shape로 정정했다.
- `project-schema-variants-strict-fields.contract.test.ts`에 ProjectResponse required-field fail-closed 케이스를 추가했다.

## 검증

- Frontend: `npm run test:contracts`
- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_public_schema_response_model_contracts.py tests/test_route_response_model_contracts.py tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py`
- CLI: `npm test -- tests/api-client-json-boundary.test.ts`

LSP diagnostics는 로컬 `typescript-language-server` 미설치로 실행되지 않았다. 타입 검증 근거는 Frontend `tsc --noEmit` 결과를 사용했다.

## LOC / 구조 메모

- `src/lib/api-project-summary.ts`: 144 pure LOC
- `src/lib/api-project-stats.ts`: 77 pure LOC
- `src/lib/project-schema-variants-strict-fields.contract.test.ts`: 175 pure LOC

> [!success]
> 이전 작업에서 205 pure LOC였던 `api-project-summary.ts`를 ProjectStats 분리로 144 pure LOC까지 낮췄다.

## 후속 과제

- `ProjectSearchResult`와 `ExploreProject`가 Backend schema와 완전히 일치하는지 별도 슬라이스로 점검한다.
- `api-contract.test.ts`는 5,000 LOC 이상이라 추가 계약 테스트는 계속 focused contract file로 분리한다.
