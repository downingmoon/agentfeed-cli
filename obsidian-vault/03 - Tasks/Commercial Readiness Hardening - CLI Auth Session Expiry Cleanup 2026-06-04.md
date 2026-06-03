---
title: Commercial Readiness Hardening - CLI Auth Session Expiry Cleanup 2026-06-04
tags:
  - agentfeed/commercial-readiness
  - agentfeed/backend
  - security/auth
  - obsidian/task
status: done
created: 2026-06-04
related:
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Private Note Auth and OAuth Nonce Cleanup 2026-06-04]]"
---

# Commercial Readiness Hardening - CLI Auth Session Expiry Cleanup 2026-06-04

## 목표

CLI browser-login session이 만료되었는데도 `pending`/`approved` 상태로 DB에 오래 남아 운영자와 사용자에게 active-looking 상태로 보이는 리스크를 줄인다.

> [!important] Invariant
> Status 조회 endpoint는 기존 계약처럼 read-only로 유지한다. 하지만 approve/exchange 같은 mutation 경로에서는 이미 만료된 session을 durable하게 `expired`로 저장한 뒤 fail-closed 해야 한다.

## 변경 요약

### Backend runtime path

- `approve_cli_auth_session` / `exchange_cli_auth_session`의 active-session 검사를 async DB-aware helper로 전환했다.
- locked 또는 expired session이면 `session.status = "expired"`를 commit한 뒤 기존 `CLI_AUTH_SESSION_LOCKED` / `CLI_AUTH_SESSION_EXPIRED` 에러를 반환한다.
- expired exchange는 token 발급 없이 종료되는 regression을 추가했다.

### Backend maintenance path

- `expire_stale_cli_auth_sessions()` maintenance service를 추가했다.
- `scripts/auth_account_maintenance.py --expire-cli-sessions` 플래그를 추가했다.
- dry-run은 matching count만 출력하고, `--apply`가 있을 때만 `pending`/`approved` + `expires_at <= now` row를 `expired`로 bulk update한다.
- Backend README에 dry-run 우선 운영 절차를 추가했다.

## 검증

> [!success] Local verification
> - Targeted: `.venv/bin/pytest tests/test_auth_maintenance.py tests/test_contracts.py -k 'auth_maintenance or cli_auth or expire_stale' -q` → 19 passed
> - Smoke dry-run: `.venv/bin/python scripts/auth_account_maintenance.py --expire-cli-sessions --limit 1` → local DB 기준 stale CLI auth session 8개 matched, committed false
> - Full lint: `uv run --locked --group dev ruff check .`
> - Full tests: `uv run --locked --group dev pytest tests` → 373 passed, 1 warning

## 남은 외부 릴리즈 블로커

> [!warning]
> Hosted strict readiness는 코드와 별개로 `api.agentfeed.dev` DNS 및 `https://agentfeed.dev/` root stale `/login` redirect 해소가 필요하다.
