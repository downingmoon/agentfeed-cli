---
title: Frontend Privacy Status Guard 2026-06-08
aliases:
  - Frontend Privacy Status Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/cli
  - agentfeed/privacy
  - agentfeed/verification
updated: 2026-06-08
---

# Frontend Privacy Status Guard 2026-06-08

> [!success] 결론
> Frontend worklog detail/review API boundary에서 `privacy_scan.status`를 Backend/CLI와 동일한 `safe | warning | danger` enum으로 고정했다. 이제 `unsafe`, blank, 임의 문자열 privacy status가 UI까지 전달되지 않고 contract mismatch로 fail-closed 된다.

## 변경 범위

- Frontend `src/lib/api.ts`
  - `ApiPrivacyStatus = 'safe' | 'warning' | 'danger'` 추가.
  - `ApiPrivacyScan.status`를 열린 `string`에서 `ApiPrivacyStatus`로 변경.
  - `PRIVACY_STATUSES: readonly ApiPrivacyStatus[]` parser constant 추가.
  - `normalizePrivacyScanForContract`가 `requireStringForContract` 대신 `requireOneOfForContract(..., PRIVACY_STATUSES, ...)`를 사용하도록 변경.
- Frontend `src/lib/api-contract.test.ts`
  - worklog detail/review payload에서 unknown privacy status `unsafe`가 fail-closed 되는 regression 추가.
- Frontend `src/lib/page-source-contract.test.ts`
  - exported `ApiPrivacyStatus`, `status: ApiPrivacyStatus`, typed parser constant가 유지되는지 source contract 추가.
- Backend
  - 이미 `PrivacyStatus = Literal["safe", "warning", "danger"]`와 ingest/review/detail schema를 사용 중이라 source 변경 없음.
- CLI
  - 이미 `PrivacyStatus = 'safe' | 'warning' | 'danger'`와 draft validation을 사용 중이라 source 변경 없음.

## Contract rule

```text
privacy_scan.status ∈ { "safe", "warning", "danger" }
```

> [!warning] 유지 규칙
> privacy status를 새로 추가하려면 Backend `PrivacyStatus`, Frontend `ApiPrivacyStatus`/`PRIVACY_STATUSES`, CLI `PrivacyStatus`/draft validation, publish/review copy와 tests를 동시에 갱신한다. API boundary에서 privacy status를 열린 string으로 되돌리지 않는다.

## Verification evidence

- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_ingest_privacy_scan_schema_matches_storage_and_contract_bounds tests/test_contracts.py::test_public_privacy_scan_defaults_invalid_status_to_safe tests/test_contracts.py::test_public_worklog_detail_sanitizes_source_and_privacy_scan_findings`
  - `uv run ruff check app/schemas/worklog.py app/schemas/ingestion.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `409 passed, 1 warning`
  - `uv run ruff check .` → 통과
- CLI targeted:
  - `npx vitest run tests/privacy.test.ts tests/git-draft.test.ts tests/cli-scan.test.ts --reporter=verbose` → `3 test files, 75 tests passed`
- CLI full:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Frontend Worklog Status Type Guard 2026-06-08]]
- [[Worklog Timeline Status Enum Guard 2026-06-08]]
- [[Frontend Worklog Review Privacy Finding Guard 2026-06-08]]
- [[CLI Ingest Status Parse Error Clarity 2026-06-08]]
