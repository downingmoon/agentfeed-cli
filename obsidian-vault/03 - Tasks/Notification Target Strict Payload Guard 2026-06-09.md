---
title: Notification Target Strict Payload Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - contracts
  - backend
  - frontend
  - openapi
  - notifications
status: done
related:
  - "[[Auth Social Explore Ingestion Strict Response Boundary 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Notification Target Strict Payload Guard 2026-06-09

> [!success]
> Backend response schema audit에서 마지막으로 남아 있던 `extra="allow"` notification target payload를 닫았다.

## Why

`NotificationTarget`은 `payload_json`을 target object에 펼쳐 넣는 구조라서 과거에는 `extra="allow"`였다. Enterprise contract 관점에서는 이 방식이 raw/debug/internal payload가 public notification response로 조용히 새는 통로가 될 수 있다.

## What changed

- Backend `NotificationTarget`
  - `extra="allow"` → `extra="forbid"`.
  - API가 실제로 허용하는 target payload key만 optional field로 명시했다.
    - `title`
    - `username`
    - `display_name`
    - `comment_id`
    - `worklog_id`
    - `parent_worklog_id`
- Frontend notification target normalizer
  - `[extraKey: string]: unknown` 제거.
  - API target payload에서 allowlist 밖 key가 오면 `notification list response contract mismatch`로 fail-closed.
  - Backend canonical contract 기준으로 snake_case key만 보존한다.
- Dev OpenAPI contract gate
  - `/v1/me/notifications` target object가 `additionalProperties=false`인지 검증한다.
  - target optional fields와 enum을 schema contract에 추가했다.

## Verification

- Backend targeted contract tests:
  - `uv run --locked --group dev pytest tests/test_contracts.py::test_notification_response_contract_rejects_unknown_types tests/test_contracts.py::test_remaining_public_response_models_reject_extra_fields tests/test_contracts.py::test_project_search_explore_notification_integration_and_ingest_routes_have_response_models -q`
  - Result: `3 passed`
- Backend full suite:
  - `uv run --locked --group dev pytest -q`
  - Result: `426 passed, 1 warning`
- Backend schema strictness audit:
  - Result: `Pydantic response schema strictness audit passed: no missing model_config or extra=allow BaseModel response classes found.`
- Frontend contract/lint:
  - `npm test -- src/lib/api-contract.test.ts src/lib/page-source-contract.test.ts`
  - `npm run lint`
  - Result: both passed.
- Dev OpenAPI gate:
  - `node --check scripts/check-openapi-contract.mjs`
  - `node scripts/check-openapi-contract.mjs`
  - Result: passed, `Schema field contracts checked: 184 fields across 36 operations`.

## Follow-up

> [!todo]
> Continue scanning remaining Frontend adapters for API payload spread/index-signature patterns that could mask contract drift.

> [!info]
> 서버/인프라/CICD 작업은 active goal 규칙에 따라 수행하지 않았다. 이번 pass는 local contract hardening only.
