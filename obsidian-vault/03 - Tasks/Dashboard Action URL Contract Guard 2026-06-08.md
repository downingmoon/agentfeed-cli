---
title: Dashboard Action URL Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/contracts
  - agentfeed/frontend
  - agentfeed/backend
  - project/tasks
aliases:
  - Dashboard action_url guard
---

# Dashboard Action URL Contract Guard 2026-06-08

> [!success] 완료
> Dashboard recent worklog의 `action_url` 계약을 Backend schema와 Frontend API parser 양쪽에서 `/worklogs/:id` 또는 `/worklogs/:id/review` 내부 경로로 고정했다. 외부 URL, unknown route, query/hash가 붙은 route는 API boundary에서 fail-closed 된다.

## 배경

[[Active Tasks]]의 contract hardening 흐름에서 Dashboard recent worklog action link는 UI helper에는 defensive fallback이 있었지만, API boundary 자체는 string drift를 충분히 닫지 못했다. Enterprise 품질 기준에서는 Backend response model과 Frontend parser가 같은 route contract를 공유해야 하므로 schema/parser/source guard를 함께 잠갔다.

## 변경 범위

### Backend

- `app/schemas/dashboard.py`
  - `DashboardRecentWorklog.action_url`에 validator 추가.
  - 허용 route를 `/worklogs/:id`, `/worklogs/:id/review`로 제한.
- `tests/test_contracts.py`
  - external URL, protocol-relative URL, unknown route, extra action segment, query string rejection regression 추가.

### Frontend

- `src/lib/api.ts`
  - `ApiDashboardActionUrl` template literal type 추가.
  - `requireDashboardActionUrl()` strict parser 추가.
  - `normalizeDashboardRecentWorklog()`가 `action_url`을 parser로 통과시키도록 변경.
- `src/lib/api-contract.test.ts`
  - dashboard action URL drift rejection test 추가.
- `src/lib/page-source-contract.test.ts`
  - parser/type/source guard 추가.
- `src/lib/dashboard-actions.ts`
  - API normalized type은 strict하게 유지하되 UI helper는 이미 렌더 직전 defensive fallback 테스트를 유지할 수 있도록 입력 타입만 좁은 adapter type으로 분리.

## 검증 Evidence

```bash
# Backend targeted
uv run pytest tests/test_contracts.py::test_dashboard_recent_action_url_contract_is_internal_worklog_path tests/test_contracts.py::test_dashboard_recent_worklogs_return_status_aware_action_urls
uv run ruff check app/schemas/dashboard.py tests/test_contracts.py

# Backend full
uv run pytest
uv run ruff check .

# Frontend
npm run test:contracts
npm run lint

# CLI/docs preflight
npm run release:preflight
```

- Backend full: `414 passed`, `ruff check .` 통과.
- Frontend contract/lint: 통과.
- CLI/docs release preflight: `27 test files`, `568 tests passed`.

## 남은 주의점

> [!warning]
> 현재 action URL id segment는 non-empty route segment 기준으로 검사한다. 추후 worklog id 형식을 UUID/slug 등으로 더 엄격히 제한하려면 Backend validator와 Frontend `ApiDashboardActionUrl` parser를 같은 PR에서 함께 변경한다.
