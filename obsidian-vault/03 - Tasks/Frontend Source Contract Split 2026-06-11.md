---
title: Frontend Source Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - refactor
status: done
related:
  - "[[Worklog Adapter Boundary Refactor 2026-06-11]]"
---

# Frontend Source Contract Split 2026-06-11

> [!success] 완료 범위
> Frontend의 1,300라인 단일 source-contract test를 SUT별 계약 테스트로 분리했다. 기능 추가, API 변경, 서버 배포는 하지 않았다.

## 변경 요약

- 삭제/대체
  - `src/lib/page-source-contract.test.ts` 단일 대형 파일을 제거했다.
- 추가
  - `src/lib/source-contract-helpers.ts`: source text assertion helper.
  - `src/lib/source-contract-files.ts`: shared source file path constants.
  - `src/lib/api-boundary-source-contract.test.ts`
  - `src/lib/shell-source-contract.test.ts`
  - `src/lib/public-profile-source-contract.test.ts`
  - `src/lib/project-search-cli-source-contract.test.ts`
  - `src/lib/feed-source-contract.test.ts`
  - `src/lib/discovery-dashboard-source-contract.test.ts`
  - `src/lib/settings-source-contract.test.ts`
  - `src/lib/worklog-card-source-contract.test.ts`
  - `src/lib/worklog-review-assets-source-contract.test.ts`
- `scripts/run-contract-tests.mjs`
  - 새 source-contract 파일들을 compile/run 목록에 명시했다.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint && npm test
```

- 결과: 통과
- 포함 범위: `tsc --noEmit`, contract test runner 전체

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_create_worklog_contracts.py tests/test_my_worklogs_filter_contracts.py tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py tests/test_project_public_stats_contracts.py tests/test_route_response_model_contracts.py tests/test_worklog_card_builder_contracts.py tests/test_worklog_card_frontend_contracts.py tests/test_worklog_card_hydration_contracts.py tests/test_worklog_model_contracts.py tests/test_worklog_normalization_contracts.py tests/test_worklog_public_detail_contracts.py tests/test_worklog_public_source_contracts.py tests/test_worklog_response_model_contracts.py tests/test_worklog_schema_contracts.py
```

- 결과: `50 passed`
- 포함 범위: backend worklog/project contract 회귀 확인

## LOC / 구조 확인

- `scripts/run-contract-tests.mjs`: 106
- `src/lib/source-contract-helpers.ts`: 33
- `src/lib/source-contract-files.ts`: 33
- 새 source-contract test 파일들은 모두 250 pure LOC 이하.
- 가장 큰 파일은 `src/lib/worklog-card-source-contract.test.ts` 241 pure LOC로 warning band에 있다.

> [!warning] 검증 제한
> LSP diagnostics는 `typescript-language-server` 미설치로 실행되지 않았다. 대신 `npm run lint`의 `tsc --noEmit`을 타입 검증 근거로 사용했다.

## 후행 과제

- `worklog-card-source-contract.test.ts`는 241 pure LOC라 다음에 worklog review auth/accessibility 계약을 별도 파일로 더 나누면 좋다.
- 다음 반복에서는 CLI 수집/전송 payload와 Backend response model 간 계약 검증 누락 여부를 계속 점검한다.
