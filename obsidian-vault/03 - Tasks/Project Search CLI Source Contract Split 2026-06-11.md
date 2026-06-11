---
title: Project Search CLI Source Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - refactor
status: done
related:
  - "[[Auth Shell Source Contract Split 2026-06-11]]"
---

# Project Search CLI Source Contract Split 2026-06-11

> [!success] 완료 범위
> `project-search-cli-source-contract.test.ts`에 섞여 있던 Project, Search, Landing preview, CLI authorize 계약을 SUT별 파일로 분리했다. 기능 추가, API 변경, 서버 배포는 하지 않았다.

## 변경 요약

- 제거
  - `src/lib/project-search-cli-source-contract.test.ts`
- 추가
  - `src/lib/project-source-contract.test.ts`
  - `src/lib/search-source-contract.test.ts`
  - `src/lib/landing-preview-source-contract.test.ts`
  - `src/lib/cli-authorize-source-contract.test.ts`
- `scripts/run-contract-tests.mjs`
  - 기존 단일 source-contract 항목을 새 4개 파일 compile/run으로 교체했다.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint && npm test
```

- 결과: 통과
- 포함 범위: `tsc --noEmit`, frontend contract test runner 전체

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_create_worklog_contracts.py tests/test_my_worklogs_filter_contracts.py tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py tests/test_project_public_stats_contracts.py tests/test_route_response_model_contracts.py tests/test_worklog_card_builder_contracts.py tests/test_worklog_card_frontend_contracts.py tests/test_worklog_card_hydration_contracts.py tests/test_worklog_model_contracts.py tests/test_worklog_normalization_contracts.py tests/test_worklog_public_detail_contracts.py tests/test_worklog_public_source_contracts.py tests/test_worklog_response_model_contracts.py tests/test_worklog_schema_contracts.py
```

- 결과: `50 passed`
- 포함 범위: backend worklog/project contract 회귀 확인

## LOC / 구조 확인

- `src/lib/project-source-contract.test.ts`: 42 pure LOC
- `src/lib/search-source-contract.test.ts`: 39 pure LOC
- `src/lib/landing-preview-source-contract.test.ts`: 25 pure LOC
- `src/lib/cli-authorize-source-contract.test.ts`: 74 pure LOC
- 현재 가장 큰 source-contract test는 `src/lib/public-profile-source-contract.test.ts` 182 pure LOC다.

> [!warning] 검증 제한
> LSP diagnostics는 `typescript-language-server` 미설치로 실행되지 않았다. 대신 `npm run lint`의 `tsc --noEmit`을 타입 검증 근거로 사용했다.

## 후행 과제

- source-contract test reviewability는 전반적으로 개선됐다. 다음 반복은 테스트 구조 정리보다 CLI 수집 payload와 Backend ingestion/Frontend evidence 표시 간 실제 contract 누락 여부를 우선 점검한다.
- 신규 기능이 필요한 사항이 발견되면 구현하지 않고 Obsidian TODO로 분리한다.
