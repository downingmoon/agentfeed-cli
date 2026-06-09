---
title: Deprecated Rotate Error OpenAPI Gate 2026-06-09
date: 2026-06-09
tags:
  - agentfeed
  - contracts
  - openapi
  - backend
  - dev-gate
status: done
related:
  - "[[Deprecated Ingest Rotate Error Response Contract 2026-06-09]]"
  - "[[AgentFeed Current Product Brief]]"
---

# Deprecated Rotate Error OpenAPI Gate 2026-06-09

> [!success]
> Deprecated `POST /v1/ingest/token/rotate` now has a CI-visible OpenAPI error-envelope guard, not just a backend-only classification.

## What changed

- [[Deprecated Ingest Rotate Error Response Contract 2026-06-09]]에서 남긴 follow-up을 닫았다.
- `agentfeed-dev/scripts/check-openapi-contract.mjs`에 `ERROR_RESPONSE_FIELD_CONTRACTS`를 추가했다.
- Deprecated route의 `403` JSON response schema가 아래 필드를 가진 typed envelope인지 검증한다.
  - `error`
  - `error.code`
  - `error.message`
  - `error.details`
- Backend `ErrorDetail.details`는 OpenAPI에서도 required로 드러나도록 required field로 고정했다.

## Why

기존 게이트는 deprecated rotate route가 backend-only라는 분류만 확인했다. 즉, route가 실수로 untyped JSON이나 다른 에러 형태로 바뀌어도 OpenAPI contract gate가 감지하지 못할 수 있었다.

## Verification

- Backend full test suite:
  - `uv run --locked --group dev pytest -q`
  - Result: `426 passed, 1 warning`
- Dev OpenAPI gate syntax:
  - `node --check scripts/check-openapi-contract.mjs`
- Dev OpenAPI contract gate:
  - `node scripts/check-openapi-contract.mjs`
  - Result: passed
  - Evidence: `Error response field contracts checked: 4 fields across 1 operations`

## Deploy note

> [!info]
> 이번 작업은 contract/schema hardening이다. 사용자가 이번 continuation에서 개인서버 배포를 명시했으므로 commit/push 이후 1회 배포한다.
