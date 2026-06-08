---
title: Visibility Type Surface Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - contract
  - frontend
  - backend
  - cli
  - enterprise-hardening
status: completed
---

# Visibility Type Surface Guard 2026-06-08

## Summary

Backend/Frontend runtime guard는 `private | unlisted | public` visibility만 허용하고 있었지만, 일부 public TypeScript/API schema surface가 여전히 `string`으로 열려 있었다. 이번 작업에서 Backend explore response schema와 Frontend API/local UI 타입 표면을 union contract로 좁혔다.

> [!success]
> DB/Backend/Frontend/CLI visibility contract는 현재 `private | unlisted | public`이다. `team` 또는 workspace visibility는 신규 기능이므로 이 goal에서는 추가하지 않고 별도 PRD 후보로만 남긴다.

## 변경 내용

- [[AgentFeed Backend]]
  - `app/schemas/explore.py`
    - `ExploreProject.visibility`를 `str`에서 `ProjectVisibility`로 축소.
  - `tests/test_contracts.py`
    - explore project가 `visibility='team'`을 거부하는 schema regression 추가.
- [[AgentFeed Frontend]]
  - `src/lib/api.ts`
    - `ApiProjectSummary.visibility`, `ApiWorklogCard.visibility`, `ApiCreatedWorklog.visibility`, `ApiPrivacySettings.default_*_visibility`, `CreateWorklogBody.visibility`를 `ProjectVisibility`로 축소.
  - `src/lib/types.ts`
    - local `Project.visibility`를 `ProjectVisibility`로 축소.
  - `src/components/pages/SettingsPage.tsx`
    - settings visibility select를 `ProjectVisibility` typed options + parser로 변경.
  - `src/lib/integration-contract.ts`
    - settings default visibility type contract compile guard 보강.
  - `src/lib/page-source-contract.test.ts`
    - visibility 타입이 다시 `string`으로 열리지 않도록 source-level guard 추가.
- [[AgentFeed CLI]]
  - 소스 변경 없음. `npm run release:preflight`로 기존 CLI visibility 축소와 새 Backend/Frontend contract가 충돌하지 않음을 확인.

## 검증 Evidence

- Frontend
  - `npm run test:contracts && npm run lint`
  - 결과: contract tests 통과, `tsc --noEmit` 통과.
- Backend targeted
  - `uv run pytest tests/test_contracts.py::test_project_visibility_schema_rejects_unknown_values tests/test_contracts.py::test_project_search_explore_notification_integration_and_ingest_routes_have_response_models && uv run ruff check app/schemas/explore.py tests/test_contracts.py`
  - 결과: `2 passed`, `All checks passed!`.
- Backend full
  - `uv run pytest && uv run ruff check .`
  - 결과: `409 passed`, `1 warning`, `All checks passed!`.
- CLI full
  - `npm run release:preflight`
  - 결과: `27 passed files`, `568 passed tests`, release preflight passed.

## 후행 과제

> [!todo]
> Frontend의 `statusLabel(status: string)` 같은 UI-only helper와 `canUnpublishWorklog({ status: string; visibility: string })`는 다음 slice에서 API union과 직접 연결 가능한지 점검한다. 단, helper가 deliberate generic utility라면 source guard보다 typed adapter 경계가 더 적절할 수 있다.

- [ ] Backend query param `app/routers/me.py`의 `status`/`visibility` filter도 schema/API-level enum으로 좁힐 수 있는지 점검.
- [ ] Frontend UI helper의 broad string 사용이 API contract를 재개방하는지, 단순 display utility인지 구분해 다음 hardening slice에서 정리.

## Links

- [[CLI Visibility Contract Guard 2026-06-08]]
- [[Frontend Project Identity Visibility Guard 2026-06-08]]
- [[Worklog Action Response Guard 2026-06-08]]
