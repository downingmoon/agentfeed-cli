---
title: Auth Shell Source Contract Split 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - refactor
status: done
related:
  - "[[Frontend Source Contract Split 2026-06-11]]"
---

# Auth Shell Source Contract Split 2026-06-11

> [!success] 완료 범위
> `worklog-card-source-contract.test.ts`에 섞여 있던 auth/session/header/feed-popover 계약을 별도 파일로 분리해 warning band를 해소했다. 기능 추가, API 변경, 서버 배포는 하지 않았다.

## 변경 요약

- `src/lib/auth-shell-source-contract.test.ts`
  - AppContext auth bootstrap, session expiry, sign-out cleanup, header auth state, worklog review auth shell, feed filter backdrop accessibility 계약을 담당한다.
- `src/lib/worklog-card-source-contract.test.ts`
  - worklog author/card/detail/comment/report/copy-prompt 계약만 담당하도록 축소했다.
- `scripts/run-contract-tests.mjs`
  - 새 auth shell source-contract test를 compile/run 목록에 추가했다.

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

- `src/lib/worklog-card-source-contract.test.ts`: 115 pure LOC
- `src/lib/auth-shell-source-contract.test.ts`: 94 pure LOC
- 가장 큰 source-contract test는 `src/lib/project-search-cli-source-contract.test.ts` 211 pure LOC로 아직 250 ceiling 이하다.

> [!warning] 검증 제한
> LSP diagnostics는 `typescript-language-server` 미설치로 실행되지 않았다. 대신 `npm run lint`의 `tsc --noEmit`을 타입 검증 근거로 사용했다.

## 후행 과제

- 다음 후보는 `project-search-cli-source-contract.test.ts` 211 pure LOC다. 아직 ceiling 이하는 아니지만 다음 변경 때 프로젝트/검색/CLI authorize 계약을 더 나누면 리뷰 부담이 줄어든다.
- CLI 수집 payload와 Backend ingestion/Frontend render evidence의 end-to-end contract 누락 여부를 계속 점검한다.
