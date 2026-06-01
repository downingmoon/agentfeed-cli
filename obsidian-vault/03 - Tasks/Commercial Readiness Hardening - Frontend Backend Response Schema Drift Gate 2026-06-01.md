---
title: Commercial Readiness Hardening - Frontend Backend Response Schema Drift Gate 2026-06-01
aliases:
  - Frontend Backend Response Schema Drift Gate
  - OpenAPI Response Field Contract Gate
  - Review Payload Typed Schema Hardening
tags:
  - agentfeed/dev
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - Frontend Backend Response Schema Drift Gate 2026-06-01

## 목적

기존 `agentfeed-dev/scripts/check-openapi-contract.mjs`는 path/method와 JSON success response 존재를 확인했지만, Frontend가 실제로 읽는 response field가 Backend OpenAPI schema에 존재하는지는 검증하지 않았습니다.

> [!danger]
> API path가 존재해도 response payload의 field가 rename/삭제되면 Frontend는 runtime에서 깨집니다. 상용화 전에는 path-level contract가 아니라 field-level contract가 필요합니다.

## 발견한 구체적 gap

- `GET /v1/worklogs/{worklog_id}/review`의 Backend `WorklogReviewResponse`가 `worklog: dict`, `preview: dict`였습니다.
- Frontend `WorklogReviewPage`는 `review.worklog.status`, `review.worklog.user_note`, `review.preview.card_title`, `review.preview.public_fields`, collection evidence source fields 등을 읽습니다.
- 즉 OpenAPI가 이 field들을 보장하지 못했고, response_model validation도 nested payload drift를 잡지 못했습니다.

## Acceptance Criteria

- [x] Backend `WorklogReviewResponse`가 typed nested schema로 바뀐다.
- [x] Review worklog payload가 `id/title/summary/user_note/model/visibility/status/public_prompt/metrics/source`를 schema로 보장한다.
- [x] Review preview payload가 `card_title/card_summary/user_note/public_fields/private_fields/safe_public_preview`를 schema로 보장한다.
- [x] Dev OpenAPI gate가 Frontend-critical response field paths를 검사한다.
- [x] Gate가 feed/worklog/review/CLI auth/project/search/explore/dashboard/token/notification response fields를 검사한다.
- [x] Static gate와 README가 response field contract를 문서화한다.
- [x] Backend targeted tests, dev OpenAPI gate, frontend contract tests, cross-repo test-all이 통과한다.

## 변경 계획

1. Backend `app/schemas/worklog.py`에서 review nested schema를 명시화.
2. Backend contract tests에 typed review schema와 raw review source validation을 추가.
3. Dev OpenAPI gate에 `RESPONSE_FIELD_CONTRACTS`와 JSON schema path resolver를 추가.
4. Dev static gate/README를 갱신.
5. 통합 검증 후 이 노트와 [[Active Tasks#P1 후보]]를 완료로 전환.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - CLI Auth Browser Approval Smoke 2026-06-01]]

## 구현 결과

- Backend `WorklogReviewResponse`의 `worklog`/`preview`를 `dict`에서 typed nested schema로 전환했습니다.
- Review payload가 `WorklogReviewWorklog`, `WorklogReviewSource`, `WorklogReviewPreview`로 OpenAPI에 노출됩니다.
- Dev OpenAPI gate에 `RESPONSE_FIELD_CONTRACTS`와 schema `$ref`/`anyOf`/array path resolver를 추가했습니다.
- Field contract는 feed cards, worklog detail/review, CLI auth session metadata/approve, profile, project detail, search, explore, dashboard, tokens, notifications를 포함합니다.
- `agentfeed-dev/README.md`와 `scripts/test-all.sh` static gate가 response field contract를 보존합니다.

## 검증 증거

- Backend targeted:
  - `.venv/bin/ruff check app/schemas/worklog.py tests/test_contracts.py` → passed.
  - `.venv/bin/python -m pytest tests/test_contracts.py -q` → 242 passed, 1 warning.
- Dev OpenAPI gate:
  - `node --check scripts/check-openapi-contract.mjs` → passed.
  - `node scripts/check-openapi-contract.mjs` → passed; operations 70 / client contracts 67 / response field contracts 22.
- Frontend contract tests:
  - `npm run test:contracts` → passed.
- Cross-repo integration:
  - `agentfeed-dev ./scripts/test-all.sh` → passed.
  - CLI: 20 files / 280 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.
- Live browser E2E:
  - `agentfeed-dev ./scripts/smoke-e2e.sh` → passed.
  - Worklog: `01afa36c-0f2b-48e6-b0cc-175d42623283`.

> [!success]
> Frontend-critical response fields are now checked against Backend OpenAPI, and the owner review payload no longer hides behind untyped `dict` response fields.
