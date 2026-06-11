---
title: Project Stats Strict Field Guard
date: 2026-06-11
tags:
  - agentfeed
  - contract
  - frontend
  - backend
status: done
---

# Project Stats Strict Field Guard

## 배경

Backend `ProjectStats`는 `extra="forbid"` 계약이며 허용 필드는 아래 9개뿐이다.

- `worklog_count`
- `total_tokens`
- `total_files`
- `total_lines_added`
- `total_lines_removed`
- `total_tests`
- `total_commits`
- `contributor_count`
- `agents_used`

Frontend `normalizeProjectStats`는 과거 호환 alias(`total_worklogs`, `total_tokens_public`, `contributors_count` 등)를 허용하고 있었기 때문에 Backend strict schema와 실제 계약 경계가 달랐다.

## 변경

- Frontend ProjectStats allowlist를 Backend 필드와 동일하게 축소했다.
- alias fallback을 제거하고 정확한 Backend 필드명만 읽도록 변경했다.
- `project-stats-strict-fields.contract.test.ts`를 추가해 다음을 고정했다.
  - 정확한 Backend `ProjectStats` 필드는 정상 보존된다.
  - legacy alias `total_worklogs`는 502 contract mismatch로 실패한다.
  - public alias `total_tokens_public`는 502 contract mismatch로 실패한다.
  - plural alias `contributors_count`는 502 contract mismatch로 실패한다.
- 기존 `api-contract.test.ts`의 ProjectStats fixture를 Backend 필드명 기준으로 정정했다.

> [!note]
> `api-contract.test.ts`는 기존부터 5,000 LOC 이상인 대형 계약 테스트 파일이다. 이번 작업은 해당 파일의 fixture 정정만 수행했고, 신규 회귀 테스트는 별도 78 LOC 파일로 분리했다.

## 검증

- Frontend: `npm run test:contracts`
- Frontend: `npm run lint && npm test`
- Backend: `uv run pytest tests/test_public_schema_response_model_contracts.py tests/test_route_response_model_contracts.py tests/test_project_stats_contracts.py`
- CLI: `npm test -- tests/api-client-json-boundary.test.ts`

LSP diagnostics는 로컬 `typescript-language-server` 미설치로 실행되지 않았다. 타입 검증 근거는 Frontend `tsc --noEmit`(`npm run lint`) 결과를 사용했다.

## 후속 과제

- Project 계열 응답 normalizer를 용도별 allowlist로 분리해야 한다.
  - `ProjectSummary`: `id`, `name`, `slug`, `visibility`
  - `ProjectResponse`: full project fields + `owner` + `stats`
  - `UserProjectSummary` / `ProjectSearchResult`: Backend schema별 필드만 허용
- 특히 Worklog에 중첩되는 `project`는 Backend `ProjectSummary` 계약을 따르므로, 현재 broad ProjectResponse allowlist가 과허용인지 별도 슬라이스로 검증한다.
