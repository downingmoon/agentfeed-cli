---
title: Ingest Remote Preview Contract Guard 2026-06-08
aliases:
  - Remote preview contract guard
  - Ingest preview schema guard
status: completed
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/contract
  - agentfeed/enterprise-hardening
  - project/tasks
---

# Ingest Remote Preview Contract Guard 2026-06-08

## 결론

`/ingest/worklogs/preview` 응답 계약을 Backend schema와 CLI parser 양쪽에서 잠갔다.

> [!success] 완료
> Backend는 더 이상 `preview: dict`로 열린 preview payload를 문서화하지 않는다. CLI도 remote preview 성공 응답을 `Record<string, unknown>`로 그대로 신뢰하지 않고 `valid`, `preview.title`, `preview.summary`, `preview.user_note`, `preview.model`, `preview.metrics_row`, `warnings`를 검증한다.

## 변경 내용

### Backend

- `app/schemas/ingestion.py`
  - `IngestPreviewPayload` 추가.
  - `IngestPreviewResponse.preview`를 `IngestPreviewPayload`로 타입화.
- `tests/test_contracts.py`
  - `test_ingest_preview_response_contract_is_typed` 추가.
  - preview 필수 field 누락, `metrics_row` 타입 오류, `warnings` 타입 오류를 validation failure로 고정.

### CLI

- `src/api/client.ts`
  - `RemotePreviewPayload` 타입 추가.
  - `previewDraftRemote`가 `parseRemotePreviewResult`로 success payload를 fail-closed 검증하도록 변경.
  - malformed remote preview success response는 `API_RESPONSE_INVALID`와 `Local draft was kept.` 메시지로 사용자에게 명확히 표시.
- `tests/api-hook.test.ts`
  - remote preview success fixture를 backend typed schema와 일치시킴.
  - `metrics_row` 누락, malformed `warnings`, malformed `valid` flag를 fail-closed regression으로 추가.
- `tests/cli-preview.test.ts`
  - remote preview JSON fixture를 strict preview shape와 일치시킴.

## 왜 필요한가

Remote preview는 publish 전 API round-trip 검증 UX다. 이 응답이 느슨하면 다음 문제가 생길 수 있다.

- Backend가 preview 필드를 바꿔도 CLI가 `String(remote.preview.title ?? draft.worklog.title)` fallback으로 조용히 숨길 수 있다.
- `warnings`가 배열이 아닌데도 CLI JSON output에 섞일 수 있다.
- publish 전 검증 화면이 실제 Backend contract와 다르게 보일 수 있다.

이번 변경은 preview 성공 응답을 Backend → CLI 양쪽에서 동일한 shape로 고정해 CLI/API contract mismatch 가능성을 줄였다.

## 검증

> [!success] Fresh verification evidence
> - Backend targeted: `uv run pytest tests/test_contracts.py::test_ingest_preview_response_contract_is_typed tests/test_contracts.py::test_preview_metrics_row_preserves_unknown_metrics && uv run ruff check app/schemas/ingestion.py tests/test_contracts.py` → 통과.
> - CLI targeted: `npx vitest run tests/cli-preview.test.ts tests/api-hook.test.ts --reporter=verbose && npm run typecheck` → `126 passed`, typecheck 통과.
> - Backend full: `uv run pytest && uv run ruff check .` → `403 passed`, ruff 통과.
> - Frontend: `npm run test:contracts && npm run lint` → 통과.
> - CLI full: `npm run release:preflight` → `565 passed`, release preflight 통과.

## 후행 과제

- Remote preview에 새 표시 필드가 필요하면 먼저 Backend `IngestPreviewPayload`와 CLI `RemotePreviewPayload`를 같이 업데이트한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙상 보류한다.

## 관련 문서

- [[Backend Schema Mutable Default Guard 2026-06-08]]
- [[Backend Ok Response Contract Guard 2026-06-08]]
- [[Active Tasks]]
