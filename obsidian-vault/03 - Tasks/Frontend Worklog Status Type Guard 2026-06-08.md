---
title: Frontend Worklog Status Type Guard 2026-06-08
aliases:
  - Frontend Worklog Status Type Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/verification
updated: 2026-06-08
---

# Frontend Worklog Status Type Guard 2026-06-08

> [!success] 결론
> Frontend API adapter가 이미 strict parser로 검증한 worklog status를 exported type에서 다시 `string`으로 열어두던 drift를 제거했다. 이제 Dashboard recent worklog, Worklog card, create response status consumer는 Backend `WorklogStatus` enum과 동일한 `ApiWorklogStatus`를 받는다.

## 변경 범위

- Frontend `src/lib/api.ts`
  - `ApiWorklogStatus = 'draft' | 'needs_review' | 'private' | 'unlisted' | 'public' | 'rejected' | 'deleted'` 추가.
  - `ApiWorklogCard.status`, `ApiDashboardRecentWorklog.status`, `ApiCreatedWorklog.status`를 `string`에서 `ApiWorklogStatus`로 변경.
  - `WORKLOG_STATUSES` parser constant를 `readonly ApiWorklogStatus[]`로 typed 연결.
- Frontend `src/lib/page-source-contract.test.ts`
  - exported `ApiWorklogStatus`와 `status: ApiWorklogStatus;`, typed parser constant가 유지되는지 source contract 추가.
- Backend
  - 이미 `DashboardRecentWorklog.status: WorklogStatus` 및 `WorklogCard.status: WorklogStatus`로 닫혀 있어 source 변경 없음.
- CLI
  - WorklogStatus가 이미 closed enum이며 Dashboard endpoint를 직접 소비하지 않아 source 변경 없음.

## Contract rule

```text
worklog.status ∈ {
  "draft", "needs_review", "private", "unlisted",
  "public", "rejected", "deleted"
}
```

> [!warning] 유지 규칙
> Backend `WorklogStatus`에 새 상태를 추가하면 Frontend `ApiWorklogStatus`, `WORKLOG_STATUSES`, Dashboard/review/navigation copy, CLI `WorklogStatus`, contract tests를 동시에 갱신한다. API adapter가 검증한 값을 exported interface에서 다시 `string`으로 넓히지 않는다.

## Verification evidence

- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_dashboard_recent_worklogs_return_status_aware_action_urls tests/test_contracts.py::test_high_traffic_routes_have_response_models`
  - `uv run ruff check app/schemas/dashboard.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `409 passed, 1 warning`
  - `uv run ruff check .` → 통과
- CLI:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Worklog Timeline Status Enum Guard 2026-06-08]]
- [[Frontend Worklog Card Adapter Fail Closed 2026-06-08]]
- [[Frontend Worklog Detail Adapter Fail Closed 2026-06-08]]
- [[Frontend UI API Boundary Guard 2026-06-08]]
