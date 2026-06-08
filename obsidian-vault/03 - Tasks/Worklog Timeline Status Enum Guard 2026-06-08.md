---
title: Worklog Timeline Status Enum Guard 2026-06-08
aliases:
  - Worklog Timeline Status Enum Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/cli
  - agentfeed/verification
updated: 2026-06-08
---

# Worklog Timeline Status Enum Guard 2026-06-08

> [!success] 결론
> Worklog timeline item status 계약을 Backend schema에서도 CLI/Frontend와 동일한 closed enum으로 고정했다. 이제 수집/ingest/review/public detail payload에 `done`, `error`, `SUCCESS` 같은 unknown timeline status가 조용히 저장되거나 UI까지 전달되지 않는다.

## 변경 범위

- Backend `app/schemas/worklog.py`
  - `WorklogTimelineStatus = Literal["success", "warning", "failed", "info"]` 추가.
  - `WorklogTimelineItem.status`를 열린 `str | None`에서 `WorklogTimelineStatus | None`로 변경.
- Backend `tests/test_contracts.py`
  - `success`, `warning`, `failed`, `info`, `None`만 허용하고 unknown status가 `WorklogTimelineItem`과 `IngestWorklogPayload`에서 validation 실패하는 regression 추가.
  - 저장된 legacy/public timeline row에 unknown status가 있으면 normalizer가 500 없이 해당 row를 drop하고 warning을 남기는 regression 추가.
- Frontend
  - 기존 `ApiTimelineItem.status`와 `normalizeTimelineItemsForContract`가 이미 `success | warning | failed | info | null`만 허용 중이라 source 변경 불필요.
- CLI
  - 기존 `WorklogTimelineItem.status`와 draft validation이 이미 `success | warning | failed | info`만 허용 중이라 source 변경 불필요.

## Contract rule

```text
worklog.timeline[].status ∈ { "success", "warning", "failed", "info", null }
```

> [!warning] 유지 규칙
> timeline status를 새로 추가하려면 Backend `WorklogTimelineStatus`, Frontend `TIMELINE_STATUSES`/`ApiTimelineItem`, CLI `TIMELINE_STATUSES`/`WorklogTimelineItem`, renderer copy/style, contract tests를 동시에 갱신한다. Backend ingest schema를 열린 문자열로 되돌리지 않는다.

## Verification evidence

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_worklog_timeline_status_requires_known_value tests/test_contracts.py::test_normalize_timeline_drops_unknown_status_without_500 tests/test_contracts.py::test_normalize_timeline_supports_legacy_rows_without_500`
  - `uv run ruff check app/schemas/worklog.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `409 passed, 1 warning`
  - `uv run ruff check .` → 통과
- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- CLI targeted:
  - `npx vitest run tests/git-draft.test.ts tests/cli-preview.test.ts --reporter=verbose` → `2 test files, 34 tests passed`
- CLI full:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Integration Status Enum Guard 2026-06-08]]
- [[Frontend Worklog Detail Array Contract Guard 2026-06-08]]
- [[Frontend Worklog Review Payload Guard 2026-06-08]]
- [[CLI Success Response Envelope Guard 2026-06-08]]
