---
title: Commercial Readiness Hardening - Auth Race and Login Smoke 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - security/auth
  - project/tasks
status: implemented
aliases:
  - 2026-05-30 auth race and login smoke hardening
---

# Commercial Readiness Hardening - Auth Race and Login Smoke 2026-05-30

> [!summary]
> Backend OAuth/CLI auth/rate-limit의 남은 P1 race·retention 리스크를 줄이고, Frontend CLI login 화면에 curl 기반 smoke assertion이 가능한 deterministic server fallback을 추가했습니다.

## 구현 요약

### Backend auth hardening

- `auth_accounts(provider, provider_user_id)`에 unique constraint를 추가했습니다.
- migration `007_auth_account_provider_identity_unique`는 중복 provider identity가 있으면 명시적으로 중단해 수동 merge를 요구합니다.
- GitHub provider account lookup은 `SELECT ... FOR UPDATE`로 잠그고 active user(`users.deleted_at IS NULL`)만 재사용합니다.
- soft-deleted user에 연결된 provider account는 fail-closed로 거부합니다.
- concurrent first-login race에서 unique violation이 발생하면 rollback 후 winning auth account를 재조회해 단일 account로 수렴합니다.
- CLI auth approve/exchange session row를 `FOR UPDATE`로 잠가 한 session에서 여러 token이 mint되는 race window를 줄였습니다.
- legacy plaintext provider token은 auth account가 touch될 때 `af1:` encrypted form으로 rotate됩니다.

### Backend rate-limit retention

- shared DB rate-limit store에 global stale event pruning을 추가했습니다.
- 기존 per `(bucket, identity)` pruning은 유지하고, cold identity rows도 retention cutoff 이후 주기적으로 삭제합니다.
- 기본 retention은 전체 rule max window의 2배와 600초 중 큰 값입니다.

### Frontend/dev login smoke

- `/cli/authorize` route가 `session_id` 누락 시 server-rendered Korean guidance를 즉시 반환합니다.
- `CliAuthorizePage`는 server wrapper에서 검증된 `sessionId` prop을 받아 interactive flow만 담당합니다.
- `agentfeed-dev/scripts/smoke-e2e.sh`가 `/cli/authorize` missing-session guidance를 `curl` + `grep`으로 검증합니다.

### Package guide consistency

- Backend integration guides의 설치 명령을 `npm install -g agentfeed-cli`로 갱신했습니다.

## 검증

- Backend targeted: `uv run --python 3.12 --locked --group dev ruff check ...` → passed
- Backend targeted: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py tests/test_rate_limit_store.py -q -k 'provider_token or auth_account_provider_identity or github_login_reuses or github_login_rejects or cli_auth_exchange or rate_limit_store'` → 16 passed
- Backend full targeted files: `uv run --python 3.12 --locked --group dev pytest tests/test_contracts.py tests/test_rate_limit_store.py -q` → 104 passed
- Backend migration offline: `uv run --python 3.12 --locked alembic upgrade head --sql` → includes `007_auth_account_provider_identity_unique`
- Frontend: `npm run test:contracts` → passed
- Frontend: `npx tsc --noEmit --incremental false` → passed
- Frontend production build: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Dev syntax: `bash -n scripts/smoke-e2e.sh && bash -n scripts/test-all.sh` → passed
- Dev live smoke: `cd ../agentfeed-dev && ./scripts/smoke-e2e.sh` → passed, including `/cli/authorize` missing-session rendered guidance

## 남은 P1 큐

> [!warning]
> 아직 전체 상용화 완료는 아닙니다. 다음 루프에서 계속 줄일 항목입니다.

- OAuth provider identity duplicate가 이미 존재하는 운영 DB에 대한 merge playbook/관리 스크립트
- Provider token legacy plaintext 전체 backfill/observability
- Frontend rendered smoke assertion 범위를 feed/review page content까지 확장

## 관련 링크

- [[Commercial Readiness Audit 2026-05-30]]
- [[Commercial Readiness Hardening - Release and Public Gates 2026-05-30]]
- [[Auth & Credential Safety]]
- [[Privacy Safety]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
