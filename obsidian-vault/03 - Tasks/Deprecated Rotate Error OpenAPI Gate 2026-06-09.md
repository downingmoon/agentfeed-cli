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

## Personal server deploy evidence

> [!success]
> User explicitly requested one personal-server deploy after this pass, so the no-deploy default was overridden for this continuation.

- Deploy command:
  - `make server-up`
- Server containers after deploy:
  - `agentfeed-server-postgres-1`: healthy
  - `agentfeed-server-backend-1`: healthy, `0.0.0.0:18080->8000/tcp`
  - `agentfeed-server-frontend-1`: healthy, `0.0.0.0:13030->3000/tcp`
- Backend readiness:
  - `curl -fsS http://161.33.171.81:18080/health/ready`
  - Result: `status=ready`, DB connected, migration head `027_browser_session_version`, up-to-date.
- Backend metadata:
  - `curl -fsS http://161.33.171.81:18080/v1/metadata`
  - Result: `api_version=v1`, `contract_version=2026-06-03`, `review_base_url=http://161.33.171.81:13030`.
- Frontend route smoke:
  - `curl -fsSI http://161.33.171.81:13030/feed`
  - Result: `HTTP/1.1 200 OK`.
- Hosted OpenAPI smoke:
  - `GET http://161.33.171.81:18080/openapi.json`
  - Result: `POST /v1/ingest/token/rotate` `403` response references `#/components/schemas/ErrorResponse`.
  - `ErrorDetail.required`: `code`, `message`, `details`.
- Hosted compatibility smoke:
  - `AGENTFEED_ALLOW_INSECURE_API=1 AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 make smoke-hosted-compatibility`
  - Result: `HOSTED_COMPATIBILITY_SMOKE_PASSED`.
