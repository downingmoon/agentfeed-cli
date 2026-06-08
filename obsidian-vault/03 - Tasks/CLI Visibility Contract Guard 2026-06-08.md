---
title: CLI Visibility Contract Guard 2026-06-08
date: 2026-06-08
tags:
  - agentfeed
  - contract
  - cli
  - backend
  - frontend
  - enterprise-hardening
status: completed
---

# CLI Visibility Contract Guard 2026-06-08

## Summary

CLI의 `Visibility` 타입에 Backend/Frontend contract에는 없는 `team` 값이 남아 있어 제거했다. Upload/publish 성공 응답도 실제 CLI ingest contract인 private-review 상태만 표현하도록 `PublishDraftStatus`/`PublishDraftVisibility` 타입을 좁혔다.

> [!success]
> `team` visibility는 현재 DB/Backend/Frontend에서 지원하지 않는다. 향후 team-scoped sharing이 필요하면 CLI-only 값으로 추가하지 말고 DB column constraint → Backend schema/API → Frontend/CLI 순서로 새 cross-repo contract를 만들어야 한다.

## 변경 내용

- [[AgentFeed CLI]]
  - `src/types.ts`
    - `Visibility = 'private' | 'unlisted' | 'public'`로 축소.
  - `src/api/client.ts`
    - `PublishDraftStatus = 'draft' | 'needs_review' | 'private' | 'already_uploaded'` 추가.
    - `PublishDraftVisibility = 'private'` 추가.
    - `PublishDraftResult.visibility`를 broad visibility가 아닌 private-review 전용 타입으로 축소.
    - upload parser의 private-review allowed set도 typed set으로 정리.
  - `tests/api-hook.test.ts`
    - CLI visibility source contract guard 추가.
  - `docs/agentfeed_local_cli_mvp_implementation_spec_v0_2.md`
    - stale `team` visibility 예시 제거.

## 검증 Evidence

- CLI targeted
  - `npx vitest run tests/api-hook.test.ts --reporter=verbose`
  - 결과: `1 passed file`, `116 passed tests`.
- CLI full release preflight
  - `npm run release:preflight`
  - 결과: `27 passed files`, `568 passed tests`, release preflight passed.
- Backend targeted contract
  - `uv run pytest tests/test_contracts.py::test_project_visibility_schema_rejects_unknown_values tests/test_contracts.py::test_visibility_and_status_supported_values_are_database_constrained tests/test_contracts.py::test_ingest_response_marks_existing_worklog_reuse && uv run ruff check app/schemas/ingestion.py app/schemas/project.py tests/test_contracts.py`
  - 결과: `3 passed`, `All checks passed!`.
- Backend full
  - `uv run pytest && uv run ruff check .`
  - 결과: `409 passed`, `1 warning`, `All checks passed!`.
- Frontend compatibility
  - `npm run test:contracts && npm run lint`
  - 결과: contract tests + `tsc --noEmit` 통과.

## 후행 과제

> [!todo]
> Team/workspace scoped sharing을 실제 제품 기능으로 만들려면 신규 기능으로 분리한다. 현재 goal에서는 신규 기능 금지이므로 todo로만 남긴다.

- [ ] Team-scoped visibility 후보 기능은 DB constraint, Backend schema, Frontend routing/visibility UX, CLI publish/review policy를 포함한 별도 PRD로 작성.
- [ ] Frontend public API type에서 아직 broad `string`으로 열려 있는 visibility/status 표시 타입을 runtime parser 결과와 같은 union으로 추가 축소할 수 있는지 다음 hardening slice에서 점검.

## Links

- [[Frontend Project Identity Visibility Guard 2026-06-08]]
- [[CLI Ingest Request Contract Guard 2026-06-08]]
- [[Worklog Action Response Guard 2026-06-08]]
