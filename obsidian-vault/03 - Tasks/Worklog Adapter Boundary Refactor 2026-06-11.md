---
title: Worklog Adapter Boundary Refactor 2026-06-11
date: 2026-06-11
tags:
  - agentfeed
  - frontend
  - contract
  - refactor
status: done
related:
  - "[[Project Read Detail Contract 2026-06-11]]"
---

# Worklog Adapter Boundary Refactor 2026-06-11

> [!success] 완료 범위
> Frontend의 `@/lib/adapters` 공개 import 표면은 유지하면서, worklog 변환 책임을 focused module로 분리했다. 서버 배포나 인프라 변경은 하지 않았다.

## 변경 요약

- `src/lib/adapters.ts`
  - 기존 직접 변환 로직을 제거하고 barrel re-export만 담당한다.
  - 기존 호출부의 `@/lib/adapters` import contract는 그대로 유지한다.
- `src/lib/worklog-adapters.ts`
  - worklog card/detail/list view model 변환을 담당한다.
  - outcome/timeline 변환은 strict normalized payload만 받으며 legacy string row를 다시 허용하지 않는다.
- `src/lib/worklog-evidence-adapters.ts`
  - metrics/source/viewer/social evidence 검증과 view model 변환을 담당한다.
  - per-agent metrics, collection sources, models, viewer state를 렌더링 전 fail-closed로 검증한다.
- source-contract tests
  - worklog adapter evidence guard 위치가 새 module로 이동한 것을 반영했다.

## 검증 증거

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run lint && npm test
```

- 결과: 통과
- 포함 범위: TypeScript `tsc --noEmit`, frontend contract test runner

```bash
cd /Users/downing/PersonalProjects/agentfeed-backend
uv run pytest tests/test_create_worklog_contracts.py tests/test_my_worklogs_filter_contracts.py tests/test_project_surface_contracts.py tests/test_project_stats_contracts.py tests/test_project_public_stats_contracts.py tests/test_route_response_model_contracts.py tests/test_worklog_card_builder_contracts.py tests/test_worklog_card_frontend_contracts.py tests/test_worklog_card_hydration_contracts.py tests/test_worklog_model_contracts.py tests/test_worklog_normalization_contracts.py tests/test_worklog_public_detail_contracts.py tests/test_worklog_public_source_contracts.py tests/test_worklog_response_model_contracts.py tests/test_worklog_schema_contracts.py
```

- 결과: `50 passed`
- 포함 범위: backend worklog/project response contract, public detail/source, normalized metrics/schema contract

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
awk pure LOC check
```

- `src/lib/adapters.ts`: 3
- `src/lib/worklog-adapters.ts`: 121
- `src/lib/worklog-evidence-adapters.ts`: 226
- `src/lib/adapter-primitives.ts`: 43
- `src/lib/user-adapters.ts`: 128
- `src/lib/project-adapters.ts`: 220

> [!warning] 검증 제한
> LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행되지 않았다. 대신 `npm run lint`의 `tsc --noEmit` 결과로 타입 검증을 대체했다.

## 후행 과제

- `src/lib/page-source-contract.test.ts`는 기존부터 큰 source-contract 집합이다. 이번 작업은 adapter production boundary를 분리했지만, 향후 source-contract test 자체도 SUT 기준으로 나누는 것이 좋다.
- Goal은 계속 활성 상태다. 다음 반복에서는 CLI/API/Frontend 중 남은 contract or UX risk를 우선순위별로 계속 줄인다.
