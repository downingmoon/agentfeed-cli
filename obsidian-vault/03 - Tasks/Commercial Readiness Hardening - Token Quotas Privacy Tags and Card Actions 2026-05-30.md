---
title: Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - security/auth
  - security/privacy
  - frontend/ux
  - project/tasks
status: implemented
aliases:
  - 2026-05-30 token quota privacy tags card actions
---

# Commercial Readiness Hardening - Token Quotas Privacy Tags and Card Actions 2026-05-30

> [!summary]
> 병렬 audit에서 발견된 Backend token issuance, public tag privacy, production docs exposure, malformed JWT handling, Frontend WorklogCard inert control gap을 상용화 전 안전장치로 보강했습니다.

## 구현 요약

### Backend token issuance safety

- `MAX_ACTIVE_INGESTION_TOKENS_PER_USER=50` 설정을 추가했습니다.
- 수동 `POST /v1/me/ingestion-tokens`와 browser-login exchange `POST /v1/auth/cli/sessions/{id}/exchange`가 같은 token issuance helper를 사용합니다.
- token 발급 전 active user row를 `FOR UPDATE`로 잠그고 active token 수를 확인합니다.
- quota 초과 시 `INGESTION_TOKEN_LIMIT_EXCEEDED` 409로 실패하며 새 token row를 만들지 않습니다.
- `/v1/me/ingestion-tokens` create/delete mutation을 rate-limit rule에 추가했습니다.
- token name은 trim 후 1~100자 범위로 검증합니다.

> [!important]
> CLI auth session은 quota 초과 시 `approved` 상태를 유지하고 `consumed_at`을 설정하지 않습니다. 사용자가 기존 token을 revoke한 뒤 같은 승인 세션을 다시 exchange할 수 있습니다.

### Backend public/privacy/runtime hardening

- production mode에서는 FastAPI `/docs`, `/redoc`, `/openapi.json`을 비활성화합니다.
- public `/tags` aggregation이 `user_settings.allow_search_indexing=false` 작성자의 worklog tag를 제외합니다.
- JWT `sub`가 UUID가 아니면 500 대신 anonymous로 처리합니다.

### Frontend WorklogCard action wiring

- Variant A 카드의 comment 버튼은 worklog detail로 이동합니다.
- share 버튼은 `navigator.share`를 우선 사용하고, 실패/미지원 시 clipboard permalink로 fallback합니다.
- clipboard 성공 시 check icon feedback을 보여줍니다.
- share/clipboard 모두 불가능하면 detail page를 열어 버튼이 inert 상태로 남지 않게 했습니다.

## 검증

- Backend targeted:
  - `uv run --python 3.12 --locked --group dev ruff check ...` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py -q -k 'ingestion_token or cli_auth_exchange or rate_limit_rules or settings_require_positive or api_documentation or malformed_jwt or tags'` → `13 passed`
- Backend full:
  - `uv run --python 3.12 --locked --group dev ruff check .` → passed
  - `uv run --python 3.12 --locked --group dev pytest tests -q` → `117 passed`
- Frontend:
  - `npm run test:contracts` → passed
  - `npx tsc --noEmit --incremental false` → passed
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Shared gate:
  - `cd ../agentfeed-dev && ./scripts/test-all.sh` → passed; CLI 158 tests, frontend build/audit, backend 117 tests/Alembic offline chain
- Live E2E:
  - `cd ../agentfeed-dev && ./scripts/smoke-e2e.sh` → passed

## 관련 링크

- [[Commercial Readiness Audit 2026-05-30]]
- [[Auth & Credential Safety#2026-05-30 Ingestion token quota and issue gate]]
- [[Privacy Safety#2026-05-30 Tags search-indexing privacy gate]]
- [[Runtime Configuration#2026-05-30 Production API docs exposure gate]]
- [[Integration - CLI Backend Frontend#2026-05-30 WorklogCard action wiring]]
- [[Active Tasks#새로 발견한 P1 후보 / 다음 루프]]
