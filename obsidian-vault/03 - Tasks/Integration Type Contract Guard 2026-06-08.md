---
title: Integration Type Contract Guard 2026-06-08
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

# Integration Type Contract Guard 2026-06-08

## Summary

Integration `status`는 이미 enum으로 검증되고 있었지만, integration `type`은 Backend/Frontend 모두 broad `string`으로 열려 있었다. 이로 인해 `/me/integrations`와 `/integrations/{type}/setup-guide` 간 type mismatch가 Settings UI까지 흘러갈 수 있었다. 이번 작업에서 integration type을 `github | claude_code | codex | cursor | gemini_cli | tokscale` contract로 좁히고, setup-guide 응답 type이 요청 type과 다르면 fail-closed 하도록 보강했다.

> [!success]
> Settings integration rows는 이제 Backend guide key, Frontend API union, setup-guide request/response type이 서로 맞을 때만 렌더링된다.

## 변경 내용

- [[AgentFeed Backend]]
  - `app/schemas/integration.py`
    - `IntegrationType` literal alias 추가.
    - `IntegrationStatus.type`, `IntegrationGuide.type`을 `IntegrationType`으로 축소.
  - `tests/test_contracts.py`
    - `INTEGRATION_GUIDES` keys와 `IntegrationType` union 동기화 테스트 추가.
    - unknown integration type이 `IntegrationStatus`/`IntegrationGuide` schema에서 거부되는지 검증.
- [[AgentFeed Frontend]]
  - `src/lib/api.ts`
    - `ApiIntegrationType` union 추가.
    - `ApiIntegrationStatus.type`, `ApiIntegrationGuide.type`, `integrations.setupGuide(type)`를 `ApiIntegrationType`으로 축소.
    - setup-guide normalizer가 unknown type과 request/response type mismatch를 fail-closed 처리.
  - `src/components/pages/SettingsPage.tsx`
    - guide cache key를 `Partial<Record<ApiIntegrationType, ApiIntegrationGuide>>`로 축소.
  - `src/lib/integration-contract.ts`
    - integration type compile contract를 `ApiIntegrationType`으로 보강.
  - `src/lib/api-contract.test.ts`, `src/lib/page-source-contract.test.ts`
    - malformed integration type/status/setup-guide mismatch regression 추가.
- [[AgentFeed CLI]]
  - 소스 변경 없음. `npm run release:preflight`로 CLI command snippets 및 package workflow가 계속 유효함을 확인.

## 검증 Evidence

- Frontend
  - `npm run test:contracts && npm run lint`
  - 결과: contract tests 통과, `tsc --noEmit` 통과.
- Backend targeted
  - `uv run pytest tests/test_contracts.py::test_integration_status_response_requires_known_status tests/test_contracts.py::test_project_search_explore_notification_integration_and_ingest_routes_have_response_models tests/test_contracts.py::test_integration_setup_guides_only_advertise_shipped_cli_commands && uv run ruff check app/schemas/integration.py tests/test_contracts.py`
  - 결과: `3 passed`, `All checks passed!`.
- Backend full
  - `uv run pytest && uv run ruff check .`
  - 결과: `409 passed`, `1 warning`, `All checks passed!`.
- CLI full
  - `npm run release:preflight`
  - 결과: `27 passed files`, `568 passed tests`, release preflight passed.

## 후행 과제

> [!todo]
> Backend path parameter `integration_type`은 아직 `str`로 받고 unknown guide를 404 처리한다. OpenAPI path enum을 노출할지, 기존 404 UX를 유지할지는 별도 API UX 결정이 필요하다.

- [ ] `/integrations/{integration_type}/setup-guide` path parameter를 enum으로 바꿀 경우 404 → 422 behavior change가 생기므로 API compatibility 관점에서 별도 검토.
- [ ] `tokscale`은 roadmap placeholder이므로 실제 기능화 전에는 guide/status/copy를 별도 PRD로 점검.

## Links

- [[Backend Integration Guide CLI Contract 2026-06-08]]
- [[Frontend Integration Setup Guide Surface 2026-06-08]]
- [[Frontend Integration Compatibility Probe 2026-06-08]]
