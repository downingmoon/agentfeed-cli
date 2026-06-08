---
title: Worklog Filter Action Type Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - contract
  - backend
  - frontend
  - cli
  - enterprise-hardening
status: completed
---

# Worklog Filter Action Type Guard 2026-06-08

## Summary

Backend `/me/worklogs` filter query와 Frontend worklog action helper가 status/visibility를 broad `string`으로 열어 두던 표면을 좁혔다. API parser에서 검증한 enum이 UI helper 또는 route filter에서 다시 arbitrary string으로 풀리지 않도록 regression guard를 추가했다.

> [!success]
> Worklog status/visibility는 이제 DB/Backend schema/API parser/Frontend action helper/CLI validation에서 모두 좁은 contract로 유지된다. `/me/worklogs`의 `all`은 filter sentinel로만 허용된다.

## 변경 내용

- [[AgentFeed Backend]]
  - `app/routers/me.py`
    - `get_my_worklogs.status`: `str | None` → `WorklogStatus | 'all' | None`.
    - `get_my_worklogs.visibility`: `str | None` → `WorklogVisibility | 'all' | None`.
  - `tests/test_contracts.py`
    - `/me/worklogs` filter annotation이 UUID/status/visibility contract를 유지하는지 regression 추가.
- [[AgentFeed Frontend]]
  - `src/lib/worklog-actions.ts`
    - `canUnpublishWorklog` input을 `ApiWorklogStatus` + `ProjectVisibility`로 축소.
  - `src/components/pages/CliAuthorizePage.tsx`
    - `statusLabel` input을 `CliAuthSessionStatus`로 축소.
  - `src/lib/page-source-contract.test.ts`
    - 위 helper들이 다시 broad `string`으로 열리지 않도록 source-level guard 추가.
- [[AgentFeed CLI]]
  - 소스 변경 없음. `npm run release:preflight`로 기존 CLI contract와 충돌 없음을 확인.

## 검증 Evidence

- Frontend
  - `npm run test:contracts && npm run lint`
  - 결과: contract tests 통과, `tsc --noEmit` 통과.
- Backend targeted
  - `uv run pytest tests/test_contracts.py::test_my_worklogs_project_id_filter_uses_fastapi_uuid_validation tests/test_contracts.py::test_keyset_list_endpoints_ignore_malformed_cursors_instead_of_500s tests/test_contracts.py::test_my_worklogs_batches_card_hydration_for_owner_dashboard && uv run ruff check app/routers/me.py tests/test_contracts.py`
  - 결과: `3 passed`, `All checks passed!`.
- Backend full
  - `uv run pytest && uv run ruff check .`
  - 결과: `409 passed`, `1 warning`, `All checks passed!`.
- CLI full
  - `npm run release:preflight`
  - 결과: `27 passed files`, `568 passed tests`, release preflight passed.

## 후행 과제

> [!todo]
> Query parameter enum은 annotation/source guard로 보강됐지만, OpenAPI generated schema가 `all` sentinel과 enum values를 정확히 노출하는지 별도 source-independent assertion을 추가할 수 있다.

- [ ] `/v1/me/worklogs` OpenAPI query param schema에서 `status`/`visibility` enum을 직접 검증하는 테스트 후보 검토.
- [ ] Frontend route/page 단에서 API-union helper가 아닌 generic display utility가 남아 있는지 다음 slice에서 전체 스캔.

## Links

- [[Visibility Type Surface Guard 2026-06-08]]
- [[CLI Visibility Contract Guard 2026-06-08]]
- [[Worklog Action Response Guard 2026-06-08]]
