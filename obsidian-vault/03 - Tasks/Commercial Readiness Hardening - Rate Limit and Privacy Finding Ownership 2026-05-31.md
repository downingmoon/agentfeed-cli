---
title: Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31
aliases:
  - Backend random bearer rate limit guard
  - Backend privacy finding ownership
created: 2026-05-31
updated: 2026-05-31
status: implemented
tags:
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/privacy
  - agentfeed/commercial-readiness
  - project/task
---

# Commercial Readiness Hardening - Rate Limit and Privacy Finding Ownership 2026-05-31

> [!success]
> Backend public/bootstrap/ingest throttles no longer trust arbitrary Bearer strings, and ingested privacy findings can no longer arrive pre-resolved.

## 목적

Rate limit middleware는 endpoint auth보다 먼저 실행됩니다. 따라서 random `Authorization: Bearer ...` 값을 identity로 신뢰하면 public/bootstrap/ingest endpoint를 token fingerprint bucket으로 우회할 수 있습니다. 또한 ingest client가 `resolved=true` finding을 보내면 publish gate의 server-side review 의미가 약해집니다.

## 변경 계약

- Public/bootstrap/ingest route는 Bearer header가 있어도 IP/network-origin identity를 사용합니다.
  - 예: `/v1/auth/cli/sessions`, `/v1/feed`, `/v1/search`, `/v1/ingest/worklogs`.
- Authenticated private `/me/*` route 등은 기존 token/cookie identity bucket을 유지합니다.
- Ingest payload의 `privacy_scan.findings[].resolved` / `resolution`은 저장 전 server-side로 무시합니다.
- DB `PrivacyFinding` row와 stored `worklog.privacy_scan_json` 모두 unresolved 상태로 저장합니다.
- Public/unlisted publish는 review route로 resolving되기 전까지 critical/high/unknown finding을 차단합니다.

> [!warning] 유지보수 지침
> DB privacy finding row가 publish gate source of truth입니다. Client-side scanner가 `resolved=true`를 보내더라도 server review endpoint 밖에서는 resolved state를 만들면 안 됩니다.

## 변경 파일

- `agentfeed-backend/app/middleware/rate_limit.py`
- `agentfeed-backend/app/routers/ingest.py`
- `agentfeed-backend/tests/test_contracts.py`

## 검증 증거

- `PYTHONDONTWRITEBYTECODE=1 uv run ruff check --no-cache app/middleware/rate_limit.py app/routers/ingest.py tests/test_contracts.py`
- `PYTHONDONTWRITEBYTECODE=1 uv run pytest -q -p no:cacheprovider tests/test_contracts.py -k 'public_bootstrap_rate_limit_identity or preresolved_critical'` — 2 passed
- `PYTHONDONTWRITEBYTECODE=1 uv run pytest -q -p no:cacheprovider` — 203 passed, 1 warning
- `PYTHONDONTWRITEBYTECODE=1 uv run ruff check --no-cache app tests`
- `git diff --check`
- `agentfeed-dev make test` — CLI 247 tests, frontend contracts/build/audit, backend ruff + 203 tests + Alembic offline chain passed

## 관련 영역

- [[Auth & Credential Safety#2026-05-31 Public and ingest IP-based rate-limit identity]]
- [[Privacy Safety#2026-05-31 Server-owned privacy finding resolution]]
- [[Active Tasks#P1 후보]]
