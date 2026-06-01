---
title: Commercial Readiness Hardening - CLI Auth URL Minimization and Production DB TLS 2026-06-01
aliases:
  - CLI auth URL minimization and production DB TLS
  - CLI authorize session URL hardening
  - Backend production database TLS enforcement
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/auth
  - agentfeed/config
status: done
created: 2026-06-01
repositories:
  - agentfeed-frontend
  - agentfeed-backend
  - AgentFeed-CLI
---

# Commercial Readiness Hardening - CLI Auth URL Minimization and Production DB TLS 2026-06-01

## 목표

> [!abstract]
> CLI browser login의 one-time `session_id`가 GitHub OAuth `next` URL/state/history/referrer 경로에 계속 노출되는 면을 줄이고, production Backend가 TLS 없는 Postgres 연결로 기동되지 않도록 fail-fast 계약을 추가했습니다.

## 변경 계약

### Frontend CLI authorize flow

- `/cli/authorize?session_id=...` 최초 진입 시 browser `sessionStorage`에 session id를 저장한 뒤 visible URL을 `/cli/authorize`로 정리합니다.
- GitHub 로그인 링크는 `auth.githubUrl('/cli/authorize')`만 사용하며 raw `session_id`를 OAuth `next` query에 넣지 않습니다.
- OAuth callback이 `/cli/authorize`로 돌아와도 client가 stored session id로 승인 화면을 복구합니다.
- Pending 상태는 Backend가 준 `poll_interval_seconds`를 1~10초 범위로 clamp해 재확인합니다.
- Approved/consumed/expired terminal state와 approve 성공 시 stored session id를 삭제합니다.
- Browser storage가 차단되어도 page crash 대신 controlled error/retry path로 남깁니다.

### Backend OAuth next normalization

- Backend 직접 호출 `GET /v1/auth/github?next=/cli/authorize?session_id=...`도 signed OAuth state에 들어가기 전에 `/cli/authorize`로 정규화합니다.
- `/cli/authorize` path 자체는 in-app return path로 유지하지만 query allowlist는 비웁니다.
- Frontend/Backend OAuth next policy가 `session_id` stripping 방향으로 일치합니다.

### Backend production database TLS

- `ENVIRONMENT=production|staging`에서는 `DATABASE_URL`에 asyncpg-compatible TLS query가 필요합니다.
- 허용값은 `?ssl=require`, `?ssl=verify-ca`, `?ssl=verify-full`입니다.
- `ssl=false`, missing TLS, `sslmode=*`는 fail-fast 합니다.
- `sslmode=require`는 libpq에서 흔하지만 SQLAlchemy asyncpg URL에서는 runtime kwargs로 안전하게 변환되지 않으므로 명시 거부합니다.

## 구현 파일

- Frontend
  - `src/app/cli/authorize/page.tsx`
  - `src/components/pages/CliAuthorizePage.tsx`
  - `src/lib/auth-next.ts`
  - `src/lib/api-contract.test.ts`
  - `src/lib/cli-auth.contract.ts`
  - `src/lib/page-source-contract.test.ts`
- Backend
  - `app/config.py`
  - `app/routers/auth.py`
  - `tests/test_contracts.py`
  - `tests/test_rate_limit_store.py`

## 검증 증거

> [!success] RED → GREEN
> - Frontend RED: `npm run test:contracts`가 기존 storage helper 부재 계약으로 실패.
> - Frontend GREEN: `npm run test:contracts` 통과.
> - Frontend typecheck: `npm run lint` 통과.
> - Frontend production-style gate: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run ci` 통과.
> - Backend RED: targeted pytest가 TLS 미강제 및 `/cli/authorize?session_id=...` 보존 때문에 4 failures.
> - Backend GREEN: targeted pytest `25 passed, 234 deselected`.
> - Backend full test: `uv run --locked --group dev pytest -q` → `264 passed, 1 warning`.
> - Backend static check: `uv run --locked --group dev ruff check ...` → `All checks passed!`.
> - Cross-repo gate: `agentfeed-dev ./scripts/test-all.sh` 통과, CLI `289 passed`, Frontend CI/build green, Backend `264 passed`, Alembic offline migration chain green.

## 원격 CI

> [!success]
> 2026-06-01 push 후 3개 repo GitHub Actions가 모두 성공했습니다.

- Frontend CI: `26761933584` success (`69655ce`)
- Backend CI: `26761932679` success (`7d58773`)
- CLI CI: `26761932446` success (`f0b9fa7`)

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Auth & Credential Safety#2026-06-01 CLI auth URL minimization]]
- [[Auth & Credential Safety#2026-06-01 Backend OAuth next allowlist]]
- [[Runtime Configuration#2026-06-01 Production database TLS enforcement]]
- [[Integration - CLI Backend Frontend#2026-06-01 CLI auth URL minimization and production DB TLS]]
