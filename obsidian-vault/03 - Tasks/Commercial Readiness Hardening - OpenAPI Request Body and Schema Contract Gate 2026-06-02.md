---
title: Commercial Readiness Hardening - OpenAPI Request Body and Schema Contract Gate 2026-06-02
aliases:
  - OpenAPI request body schema contract gate
  - API shape drift gate 2026-06-02
tags:
  - agentfeed/commercial-readiness
  - agentfeed/integration
  - agentfeed/openapi
  - agentfeed/dev-gate
status: verified
created: 2026-06-02
---

# Commercial Readiness Hardening - OpenAPI Request Body and Schema Contract Gate 2026-06-02

> [!success] 목표
> CLI/API/Frontend가 같은 wire contract를 쓰도록 OpenAPI gate를 path/method 존재 확인에서 request body와 response schema의 type, required, nullable, enum, format 검증까지 확장합니다.

## 관련 맥락

- 상위 목표: [[Active Tasks#P1 후보]]
- 통합 기준: [[Integration - CLI Backend Frontend#계약 기준]]
- 이전 게이트: [[Commercial Readiness Hardening - Frontend Backend Response Schema Drift Gate 2026-06-01]]
- 교차 레포 운영: [[Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02]]

## 변경 범위

- `agentfeed-dev/scripts/check-openapi-contract.mjs`
  - `REQUEST_BODY_FIELD_CONTRACTS` 추가.
  - `SCHEMA_FIELD_CONTRACTS` 추가.
  - request body JSON schema 검사 추가.
  - response schema field의 `type`, `required`, `nullable`, `enumValues`, `format` 검사 추가.
- `agentfeed-dev/scripts/test-all.sh`
  - 새 contract section/출력/README 문구가 사라지면 실패하도록 static marker gate 추가.
- `agentfeed-dev/README.md`
  - OpenAPI contract gate가 request-body and schema field contracts를 검증한다고 명시.

## 고정된 계약

- CLI browser login은 `verifier`, `device_name`, `replace_token_id` request body contract와 `token/token_id/token_expires_at` exchange response contract를 검증합니다.
- CLI ingest upload/preview는 `source`, `project`, `worklog`, `privacy_scan`, metrics/session metadata request body shape를 검증합니다.
- Frontend worklog/project/profile/settings/token forms는 omitted-vs-null semantics와 enum visibility를 검증합니다.
- Feed/review/project/profile/token/settings response는 client가 렌더링하는 필드의 type/nullability/requiredness를 검증합니다.

## 검증 증거

- RED: static marker check가 `REQUEST_BODY_FIELD_CONTRACTS`, `SCHEMA_FIELD_CONTRACTS`, README 문구 부재로 실패했습니다.
- GREEN: `node scripts/check-openapi-contract.mjs`
  - OpenAPI operations checked: 70
  - Client contracts checked: 67
  - Response field contracts checked: 22
  - Request body field contracts checked: 110 fields across 14 operations
  - Schema field contracts checked: 72 fields across 14 operations
  - Classified backend-only operations: 3
- GREEN: `agentfeed-dev ./scripts/test-all.sh`
  - AgentFeed CLI: 314 tests passed, typecheck passed, release preflight passed, production dependency audit passed.
  - Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed, production dependency audit passed.
  - Backend: `ruff check .` passed, 283 tests passed, Alembic offline migration chain generated through `019_audit_events`.

## 남은 리스크

> [!warning]
> 이 게이트는 OpenAPI schema drift를 빠르게 잡는 정적 계약입니다. 실제 브라우저 hydration, OAuth provider, DB state와 결합된 문제는 기존 `make smoke-e2e`/live smoke 계층에서 계속 검증해야 합니다.
