---
title: Cli Auth Session Status Enum Guard 2026-06-08
aliases:
  - CLI Auth Session Status Enum Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/verification
updated: 2026-06-08
---

# Cli Auth Session Status Enum Guard 2026-06-08

> [!success] 결론
> CLI browser approval의 session metadata status 계약을 Backend와 Frontend에서 동일한 closed enum으로 고정했다. 이제 `/auth/cli/sessions/{session_id}` 성공 payload가 임의 문자열 status를 포함하면 Backend schema 또는 Frontend API boundary에서 fail-closed 된다.

## 변경 범위

- Backend `app/schemas/auth.py`
  - `CliAuthSessionStatus = Literal["pending", "approved", "consumed", "expired"]` 추가.
  - `CliAuthSessionStatusResponse.status`를 열린 `str`에서 `CliAuthSessionStatus`로 변경.
- Backend `tests/test_contracts.py`
  - `pending`, `approved`, `consumed`, `expired`만 허용하고 `locked`, `revoked`, `failed`, blank, casing mismatch가 실패하는 regression 추가.
- Frontend `src/lib/api.ts`
  - `CliAuthSessionStatus` type 추가.
  - `CliAuthSessionMetadata.status`의 `| string` fallback 제거.
  - `normalizeCliAuthSession`이 allowed status set을 벗어나면 `AgentFeed CLI auth response contract mismatch`로 fail-closed 처리.
  - `CliAuthApproveResult.ok`도 `true` literal로 좁혀 approval success contract와 일치시킴.
- Frontend `src/lib/cli-auth.contract.ts`
  - malformed session status case를 unknown status `locked`로 명시.
- CLI
  - 직접 session status endpoint를 소비하지 않으므로 source 변경 없음. 전체 release preflight로 영향 없음 확인.

## Contract rule

```text
GET /v1/auth/cli/sessions/{session_id}
success data.status ∈ { "pending", "approved", "consumed", "expired" }
```

> [!warning] 유지 규칙
> CLI auth session 상태를 새로 추가해야 한다면 Backend schema, Frontend `CliAuthSessionStatus`, page copy/state transition, contract tests를 동시에 갱신한다. 임의 문자열 fallback으로 UI에서만 흡수하지 않는다.

## Verification evidence

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_cli_auth_session_status_response_requires_known_status tests/test_contracts.py::test_cli_auth_session_metadata_is_public_but_does_not_expose_secrets tests/test_contracts.py::test_cli_auth_session_metadata_reports_expired_without_mutating_row`
  - `uv run ruff check app/schemas/auth.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `406 passed, 1 warning`
  - `uv run ruff check .` → 통과
- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- CLI:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Cli Auth Approve True Ok Guard 2026-06-08]]
- [[Backend Ok Response Contract Guard 2026-06-08]]
- [[Frontend UI API Boundary Guard 2026-06-08]]
