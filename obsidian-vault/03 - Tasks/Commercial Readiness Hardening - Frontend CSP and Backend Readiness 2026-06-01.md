---
title: Commercial Readiness Hardening - Frontend CSP and Backend Readiness 2026-06-01
date: 2026-06-01
tags:
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/readiness
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Frontend CSP fail closed and backend readiness
---

# Frontend CSP and Backend Readiness

> [!success]
> Frontend API URL/CSP policy no longer silently falls back to localhost on invalid runtime config, and Backend now exposes a DB + migration-aware readiness probe that dev Compose uses for service health.

## 결과

### Frontend env/CSP

- `src/lib/api-url.ts`를 추가해 runtime API root normalization, config error, CSP connect-origin derivation을 분리했습니다.
- `src/lib/api.ts`는 API URL normalization을 새 shared module에서 re-export합니다.
- `src/lib/security-headers.ts`가 자체 URL parser와 invalid URL → localhost fallback을 제거했습니다.
- Invalid API root가 CSP에 들어오면 `connect-src 'self'`로 fail-closed 처리합니다.
- Contract tests가 valid API origin, invalid URL fail-closed, production localhost rejection을 고정합니다.

### Backend readiness

- `/health` liveness는 기존 `{"status":"ok"}` 계약을 유지합니다.
- `/health/ready`를 추가했습니다.
  - DB `SELECT 1` connectivity 확인
  - `alembic_version` current revision 확인
  - Alembic script head와 DB revision 비교
  - DB unavailable 또는 stale migration이면 `503` + structured readiness payload 반환
- Backend README에 liveness/readiness 차이를 문서화했습니다.

### Dev orchestration

- `agentfeed-dev/compose.yaml` Backend healthcheck를 `/health/ready`로 전환했습니다.
- `wait-ready.sh` 출력도 Backend readiness URL을 표시합니다.
- OpenAPI contract gate에서 `/health/ready`를 backend-only operational endpoint로 분류했습니다.

## 제품 계약

> [!important]
> Frontend CSP는 잘못된 API URL을 localhost로 대체하지 않습니다. API URL parsing에 실패하면 네트워크 connect surface를 `'self'`로 줄여 fail-closed 상태를 유지해야 합니다.

> [!important]
> Load balancer와 dev Compose는 traffic 가능 여부를 `/health/ready`로 판단합니다. `/health`는 process liveness만 확인하고 DB/migration readiness를 증명하지 않습니다.

## 검증

- Frontend: `npm run ci` → typecheck, contract tests, production build passed
- Frontend manual env checks:
  - `NODE_ENV=production NEXT_PUBLIC_API_URL=not-a-url node scripts/check-env.mjs` → failed as expected
  - `NODE_ENV=production NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=0 node scripts/check-env.mjs` → failed as expected
  - `NODE_ENV=production NEXT_PUBLIC_API_URL=https://api.agentfeed.dev node scripts/check-env.mjs` → passed
- Backend: `uv run --locked --group dev ruff check .` → passed
- Backend: `uv run --locked --group dev pytest tests` → 222 passed
- Backend: `uv run --locked alembic upgrade head --sql` → 449-line offline migration SQL generated
- Dev: `./scripts/test-wait-ready.sh` → passed
- Dev: `node scripts/check-openapi-contract.mjs` → passed with 69 operations, 3 backend-only endpoints
- Dev: `docker compose --env-file .env.example config --quiet` → passed

## 연결

- [[Integration - CLI Backend Frontend#2026-06-01 Frontend CSP fail-closed and Backend readiness]]
- [[Active Tasks#P1 후보]]
- [[Commercial Readiness Hardening - Cross Repo CI Gates 2026-06-01]]
