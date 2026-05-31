---
title: Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31
aliases:
  - Browser approved token rotation
created: 2026-05-31
updated: 2026-05-31
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/security
  - agentfeed/auth
  - agentfeed/cli
  - agentfeed/backend
---

# Commercial Readiness Hardening - Browser Approved Token Rotation 2026-05-31

> [!success]
> Ingestion token rotation no longer lets a bearer ingestion token mint a fresh long-lived token by itself. Replacement now requires browser-approved session ownership or Settings session auth.

## 목적

상용화 readiness follow-up의 마지막 P2 보안 항목이었던 leaked ingestion token self-rotation risk를 제거했습니다.

- [[Commercial Readiness Audit Followups 2026-05-31]]
- [[Auth & Credential Safety#2026-05-31 Browser-approved ingestion token rotation]]
- [[Integration - CLI Backend Frontend#2026-05-31 Browser-approved token rotation contract]]

## 문제

기존 `POST /v1/ingest/token/rotate`는 bearer ingestion token만으로 새 raw token을 반환했습니다.

> [!danger]
> 토큰이 유출되면 공격자가 기존 token으로 직접 rotate해서 새 장기 token을 얻을 수 있어, 단순 revoke/expiry 정책의 효과가 약해집니다.

## 변경

### Backend

- `POST /v1/ingest/token/rotate`는 더 이상 raw token을 발급하지 않습니다.
- 해당 endpoint는 valid ingestion token이어도 `INGESTION_TOKEN_ROTATION_REQUIRES_SESSION` 403을 반환합니다.
- OpenAPI에서도 이 경로를 deprecated 403 remediation endpoint로 표시하고 raw-token success response model을 제거했습니다.
- CLI browser auth session에 `replace_token_id`를 추가했습니다.
- browser-approved `/v1/auth/cli/sessions/{session_id}/exchange`에서 `replace_token_id`가 있으면 해당 token을 row-lock 후 revoke하고 replacement raw token을 1회 반환합니다.
- Settings의 session-authenticated `/v1/me/ingestion-tokens/{id}/rotate`는 계속 server-side ownership 확인 후 rotate합니다.
- Alembic migration `016_cli_auth_session_replace_token`이 `cli_auth_sessions.replace_token_id`를 추가합니다.

### CLI

- `agentfeed rotate`가 token-authenticated self-rotation endpoint를 직접 호출하지 않습니다.
- stale `rotateIngestionToken()` client helper와 self-rotation success mock test를 제거해 CLI 내부 계약도 browser-approved replacement로 단일화했습니다.
- saved token이 있으면 먼저 `/ingest/status`로 token id를 확인하고, browser approval session에 `replace_token_id`를 담아 replacement를 요청합니다.
- status로 token id를 확인하지 못하면 browser login replacement는 진행하지만 이전 token은 Settings에서 수동 revoke가 필요하다고 안내합니다.
- `AGENTFEED_TOKEN` 환경변수는 기존처럼 CLI가 직접 mutate하지 않고 Settings/secret manager 교체를 안내합니다.
- README rotation 안내를 browser-approved replacement 기준으로 갱신했습니다.

## 검증

> [!check] Backend
> - targeted token rotation tests passed
> - token-authenticated rotation OpenAPI route metadata is deprecated, status 403, and has no raw-token response model
> - `PYTHONDONTWRITEBYTECODE=1 uv run pytest -q -p no:cacheprovider` → 206 passed
> - `PYTHONDONTWRITEBYTECODE=1 uv run ruff check --no-cache app tests alembic/versions/016_cli_auth_session_replace_token.py`
> - `PYTHONDONTWRITEBYTECODE=1 uv run alembic upgrade head --sql` → migration chain includes `016_cli_auth_session_replace_token`
> - `git diff --check`

> [!check] CLI
> - `npm test -- --run tests/api-hook.test.ts tests/cli-status-doctor.test.ts`
> - `npm run typecheck`
> - `npm test -- --run` → 247 passed
> - `npm pack --dry-run`
> - `git diff --check`

> [!check] Frontend
> - Settings token management already uses session-authenticated `/me/ingestion-tokens/{id}/rotate`.
> - `npm run lint`
> - `npm run test:contracts`
> - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev/v1 npm run build`

> [!check] Cross-repo
> - `make test` in `agentfeed-dev` → CLI 247 tests, frontend contracts/build/audit, backend 206 tests, Alembic offline migration chain passed.
> - `make smoke-e2e` in `agentfeed-dev` → verifies token-authenticated self-rotation returns 403, browser-approved replacement revokes the old token, CLI upload uses the replacement token, review/publish/feed hydrated DOM pass.

## 남은 리스크

> [!warning]
> If a saved token is already invalid when `agentfeed rotate` starts, the CLI cannot identify which old token to revoke. It issues a browser-approved replacement and tells the user to revoke stale tokens in Settings.
