---
title: Ingestion Status True Ok Guard 2026-06-08
aliases:
  - Ingestion status ok guard
  - CLI token status true ok guard
status: completed
date: 2026-06-08
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/contract
  - agentfeed/enterprise-hardening
  - project/tasks
---

# Ingestion Status True Ok Guard 2026-06-08

## 결론

`GET /ingest/status`의 성공 payload가 `ok: true`일 때만 유효하도록 Backend schema와 CLI parser를 함께 잠갔다.

> [!success] 완료
> Backend `IngestionStatusResponse.ok`는 `Literal[True]`가 되었고, CLI `parseIngestionTokenStatus`는 `ok === true`가 아니면 token check를 unhealthy로 처리한다. 200 응답에 `ok: false` 또는 `ok: "true"`가 섞여도 더 이상 건강한 토큰으로 보지 않는다.

## 변경 내용

### Backend

- `app/schemas/ingestion.py`
  - `IngestionStatusResponse.ok: Literal[True]`로 변경.
- `tests/test_contracts.py`
  - `test_ingestion_status_response_requires_true_ok` 추가.
  - `ok: false`, `ok: "true"`를 schema validation failure로 고정.

### CLI

- `src/api/client.ts`
  - `parseIngestionTokenStatus`가 boolean이면 통과시키던 로직을 `value.ok === true`로 변경.
  - 반환 payload도 `ok: true`로 normalize.
- `tests/api-hook.test.ts`
  - ingestion status malformed cases에 `false ok flag`, `string ok flag` 추가.

## 왜 필요한가

CLI `agentfeed status`, `doctor`, `publish/share` preflight는 `/ingest/status`를 token health 근거로 사용한다. 이 응답에서 `ok: false`가 200 success body로 내려왔을 때 CLI가 단순 boolean으로만 받아들이면 다음 문제가 생긴다.

- 실제로는 unhealthy인 token 상태를 healthy처럼 표시할 수 있다.
- upload preflight가 잘못된 성공 판단을 할 수 있다.
- Backend schema와 CLI parser가 `OkResponse`/remote preview에서 강화한 `true success` 규칙과 어긋난다.

이번 변경은 success contract의 의미를 `ok true`로 일관화했다.

## 검증

> [!success] Fresh verification evidence
> - Backend targeted: `uv run pytest tests/test_contracts.py::test_ingestion_status_response_requires_true_ok tests/test_contracts.py::test_ingest_status_returns_token_lifecycle_metadata && uv run ruff check app/schemas/ingestion.py tests/test_contracts.py` → 통과.
> - CLI targeted: `npx vitest run tests/api-hook.test.ts --reporter=verbose && npm run typecheck` → `115 passed`, typecheck 통과.
> - Backend full: `uv run pytest && uv run ruff check .` → `404 passed`, ruff 통과.
> - Frontend: `npm run test:contracts && npm run lint` → 통과.
> - CLI full: `npm run release:preflight` → `567 passed`, release preflight 통과.

## 후행 과제

- 다른 status/health 계열 success payload도 `ok: true` 의미가 있다면 `Literal[True]`와 client fail-closed parser를 함께 적용한다.
- 서버/인프라/CICD/배포는 현재 goal 규칙상 보류한다.

## 관련 문서

- [[Ingest Remote Preview Contract Guard 2026-06-08]]
- [[Backend Ok Response Contract Guard 2026-06-08]]
- [[Active Tasks]]
