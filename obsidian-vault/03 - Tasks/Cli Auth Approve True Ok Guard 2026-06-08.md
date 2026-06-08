---
title: Cli Auth Approve True Ok Guard 2026-06-08
aliases:
  - CLI Auth Approve True Ok Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/verification
updated: 2026-06-08
---

# Cli Auth Approve True Ok Guard 2026-06-08

> [!success] 결론
> CLI browser approval 성공 payload를 Backend schema와 Frontend parser 양쪽에서 `ok: true`, `status: "approved"`로 고정했다. 이제 backend OpenAPI/response model이 `ok: bool` 또는 임의 status를 성공 payload처럼 문서화하지 않는다.

## 변경 범위

- Backend `app/schemas/auth.py`
  - `CliAuthApproveResponse.ok`를 `Literal[True]`로 변경.
  - `CliAuthApproveResponse.status`를 `Literal["approved"]`로 변경.
- Backend `tests/test_contracts.py`
  - `ok: false`, string `"true"`, `pending`, blank status가 schema validation에서 실패하는 regression 추가.
- Frontend
  - `normalizeCliAuthApproveResult`는 이미 `ok !== true`, `status !== "approved"`를 fail-closed 처리 중이라 source 변경 불필요.
- CLI
  - 이번 slice는 browser approval API response contract 보강이며 CLI command source 변경 불필요.

## Contract rule

```text
POST /v1/auth/cli/sessions/{session_id}/approve
success data = { ok: true, status: "approved" }
```

> [!warning] 유지 규칙
> CLI browser approval 성공 의미를 넓히지 말 것. `ok: false`, `status: "pending"` 같은 값은 success envelope 내부에 들어가면 안 되며, 실패/대기 상태는 별도 error/status path로 표현한다.

## Verification evidence

- Backend targeted regression:
  - `uv run pytest tests/test_contracts.py::test_cli_auth_approve_response_requires_true_ok_and_approved_status tests/test_contracts.py::test_cli_auth_approval_requires_matching_human_code`
  - `uv run ruff check app/schemas/auth.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `405 passed, 1 warning`
  - `uv run ruff check .` → 통과
- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- CLI:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Backend Ok Response Contract Guard 2026-06-08]]
- [[Ingestion Status True Ok Guard 2026-06-08]]
- [[CLI Metadata Parse Error Clarity 2026-06-08]]
- [[CLI Ingest Status Parse Error Clarity 2026-06-08]]
