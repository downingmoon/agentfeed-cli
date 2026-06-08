---
title: Integration Status Enum Guard 2026-06-08
aliases:
  - Integration Status Enum Guard
status: done
tags:
  - agentfeed/contract
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/verification
updated: 2026-06-08
---

# Integration Status Enum Guard 2026-06-08

> [!success] 결론
> `/me/integrations` status 계약을 Backend schema와 Frontend exported type/parser에서 동일한 closed enum으로 고정했다. 이제 Backend가 임의 문자열 status를 문서화하거나 Frontend consumer가 integration status를 열린 `string`으로 취급하지 않는다.

## 변경 범위

- Backend `app/schemas/integration.py`
  - `IntegrationConnectionStatus = Literal["connected", "not_connected", "needs_setup"]` 추가.
  - `IntegrationStatus.status`를 열린 `str`에서 `IntegrationConnectionStatus`로 변경.
- Backend `tests/test_contracts.py`
  - `connected`, `not_connected`, `needs_setup`만 허용하고 `pending`, `disabled`, blank, casing mismatch가 실패하는 regression 추가.
- Frontend `src/lib/api.ts`
  - `ApiIntegrationConnectionStatus` type 추가.
  - `ApiIntegrationStatus.status`를 열린 `string`에서 `ApiIntegrationConnectionStatus`로 변경.
  - 기존 `normalizeIntegrationStatus`의 strict allowed-value parser와 exported type을 일치시킴.
- Frontend `src/components/pages/SettingsPage.tsx`
  - `IntegrationBadge` prop을 `ApiIntegrationConnectionStatus`로 좁혀 UI layer에서 contract가 다시 열리지 않도록 보강.
- CLI
  - `/me/integrations` endpoint를 직접 소비하지 않으므로 source 변경 없음. `release:preflight`로 영향 없음 확인.

## Contract rule

```text
GET /v1/me/integrations
success data[].status ∈ { "connected", "not_connected", "needs_setup" }
```

> [!warning] 유지 규칙
> integration lifecycle status를 추가해야 한다면 Backend schema, Frontend `ApiIntegrationConnectionStatus`, Settings badge/copy, contract tests를 동시에 갱신한다. Backend는 열린 문자열로 문서화하지 않고, Frontend도 type fallback으로 숨기지 않는다.

## Verification evidence

- Backend targeted:
  - `uv run pytest tests/test_contracts.py::test_integration_status_response_requires_known_status tests/test_contracts.py::test_high_traffic_routes_have_response_models`
  - `uv run ruff check app/schemas/integration.py tests/test_contracts.py`
- Backend full:
  - `uv run pytest` → `407 passed, 1 warning`
  - `uv run ruff check .` → 통과
- Frontend:
  - `npm run test:contracts`
  - `npm run lint`
- CLI:
  - `npm run release:preflight` → `27 test files, 567 tests passed`

## Related

- [[Cli Auth Session Status Enum Guard 2026-06-08]]
- [[Frontend UI API Boundary Guard 2026-06-08]]
- [[Backend Schema Mutable Default Guard 2026-06-08]]
