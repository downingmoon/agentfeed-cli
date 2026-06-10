---
title: Personal Server Deploy 2026-06-10
date: 2026-06-10
tags:
  - agentfeed
  - deploy
  - personal-server
  - smoke-test
status: done
---

# Personal Server Deploy 2026-06-10

> [!success] Result
> Explicit user request에 따라 개인서버 `161.33.171.81`에 AgentFeed CLI/API/Frontend 최신 로컬 상태를 배포했다.

## Deployment

- Command: `make server-up`
- Script: `agentfeed-dev/scripts/server-deploy.sh --execute --up`
- Remote host: `trading-bot`
- Remote root: `~/agentfeed`
- Backend: `0.0.0.0:18080 -> 8000`
- Frontend: `0.0.0.0:13030 -> 3000`
- Postgres: `127.0.0.1:15432 -> 5432`

## Deployed revisions

- CLI/docs: `96bfb6d` — `Document user profile contract split`
- Backend: `7f23e2c` — `Split user profile contract tests`
- Frontend: `46828e1` — `Reject malformed frontend error envelopes`
- Dev orchestration: `622293e` — `Gate strict client error response schemas`

## Pre-deploy verification

```text
uv run --locked --group dev pytest tests/test_user_profile_contracts.py
# 2 passed
```

```text
uv run --locked --group dev pytest
# 428 passed, 1 warning
```

```text
node scripts/check-openapi-contract.mjs
# AgentFeed OpenAPI contract gate passed.
# OpenAPI operations checked: 75
# Client contracts checked: 70
```

```text
bash scripts/test-all.sh
# CLI: 591 passed, typecheck, release preflight, audit 0 vulnerabilities
# Frontend: typecheck, mock API compatibility, production build, audit 0 vulnerabilities
# Backend: ruff, 428 passed, alembic offline migration chain
```

## Post-deploy verification

```text
ssh trading-bot 'cd ~/agentfeed/agentfeed-dev && docker compose --env-file .env ps'
# backend healthy
# frontend healthy
# postgres healthy
```

```text
AGENTFEED_HOSTED_API_BASE_URL=http://161.33.171.81:18080/v1 \
AGENTFEED_HOSTED_FRONTEND_URL=http://161.33.171.81:13030 \
AGENTFEED_ALLOW_INSECURE_API=1 \
AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 \
NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 \
bash scripts/smoke-hosted-compatibility.sh
# HOSTED_COMPATIBILITY_SMOKE_PASSED
```

Verified hosted checks:

- Frontend deployment compatibility passed.
- Backend metadata compatibility passed: `v1 / 2026-06-03`.
- Backend readiness passed at `/health/ready` and `/v1/health/ready`.
- CLI doctor confirmed hosted API reachable and compatible.
- Frontend diagnostic probes passed: `metadata`, `feed`, `auth-me`, `me-settings`, `me-notifications`, `me-integrations`, `integration-setup-guide`, `projects`, `check-username`, `search`, `tags`, `explore`.

## Known constraints

> [!warning]
> 현재 개인서버 테스트 배포는 IP 기반 HTTP 모드다. 프로덕션 공개 전에는 도메인, HTTPS, OAuth callback URL, secure cookie 설정을 별도 pass로 정리해야 한다.

## Follow-up

- [ ] 도메인/HTTPS 준비 후 `AGENTFEED_ALLOW_INSECURE_*` 플래그 제거.
- [ ] GitHub OAuth callback을 최종 도메인 기준으로 재설정.
- [ ] 서버 배포 smoke에 로그인/게시까지 포함하는 authenticated flow를 별도 안전 데이터로 추가.
