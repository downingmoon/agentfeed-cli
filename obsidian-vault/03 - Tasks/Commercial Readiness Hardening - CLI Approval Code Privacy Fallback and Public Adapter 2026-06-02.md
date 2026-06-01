---
title: Commercial Readiness Hardening - CLI Approval Code Privacy Fallback and Public Adapter 2026-06-02
aliases:
  - CLI approval code privacy fallback public adapter hardening
  - 2026-06-02 approval code hardening
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/privacy
  - agentfeed/supply-chain
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - CLI Approval Code Privacy Fallback and Public Adapter 2026-06-02

## 목적

> [!important]
> CLI browser approval, Backend publish privacy fallback, Frontend public feed adapter, CLI release/privacy guardrail을 같은 commercial readiness 경계로 정렬했습니다.

이번 작업은 sidecar audit에서 발견된 high-risk 경로를 닫는 것이 목표였습니다.

- CLI authorize link phishing으로 victim browser가 attacker CLI session에 ingestion token을 발급할 수 있는 경로 차단
- Backend server publish fallback finding을 UI에서 resolved 처리만 하고 실제 content가 redaction되지 않은 상태로 publish되는 경로 차단
- Frontend public/feed/profile/project/search/landing surface가 Backend regression으로 private/non-public row를 받더라도 렌더링하지 않도록 fail-closed 처리
- CLI local URL trust, release preflight, token/header scanner, configured command env scrubber 보강

## 변경 사항

### AgentFeed-CLI

- Browser login session parser가 Backend `user_code`를 필수로 요구하고, terminal에 `Approval code: 123-456` 형태로 표시합니다.
- Local review/authorize URL trust가 `127.evil.com` 같은 127-prefix hostname spoofing을 local origin으로 오인하지 않도록 `node:net.isIP()` 기반으로 검증합니다.
- Privacy scanner가 GitHub fine-grained PAT, GitLab `glpat-`, HuggingFace `hf_`, Stripe `sk_live`/`rk_live` provider token을 직접 탐지합니다.
- Authorization header scanner가 JSON quoted form도 redaction합니다.
- Configured subprocess env scrubber가 `PGPASSWORD`, `DATABASE_URL`, `REDIS_URL`, `*_DATABASE_URL`, `*_REDIS_URL`을 기본 scrub 대상으로 포함합니다.
- Release workflow가 clean checkout에서 `dist`가 없는 상태로 preflight를 실행하지 않도록 build step과 preflight guidance를 정렬했습니다.

### agentfeed-backend

- `cli_auth_sessions.approval_code_hash` 컬럼과 Alembic migration `018_cli_auth_session_approval_code`를 추가했습니다.
- CLI auth session 생성 시 browser에 입력해야 하는 terminal code를 발급하고, raw code는 저장하지 않고 hash만 저장합니다.
- `/cli-auth/sessions/{id}/approve`가 `user_code`를 검증하며, wrong/missing code는 `CLI_AUTH_USER_CODE_INVALID`로 거부합니다.
- Backend publish fallback scanner가 provider token taxonomy를 CLI scanner와 맞춥니다.
- `server_publish_fallback` finding을 resolved 처리해도 publish 직전 public field를 다시 scan해 실제 content redaction 여부를 확인합니다.
- GitHub Actions CI가 Postgres 16 service에서 Alembic live migration까지 실행하도록 보강했습니다.

### agentfeed-frontend

- CLI authorize page에 terminal approval code input을 추가하고, approve API body에 `user_code`를 보냅니다.
- `WorklogReviewPage`가 privacy findings missing/malformed 상태를 synthetic blocking finding으로 처리해 publish를 fail-closed 합니다.
- `adaptPublicWorklogCards()`를 추가하고 feed/search/profile/project/explore/landing public list surface가 `status === "public"` 및 `visibility === "public"` row만 렌더링하도록 정렬했습니다.

## 검증 증거

> [!success] Local full gates passed
> 세 레포 변경 후 `agentfeed-dev ./scripts/test-all.sh`가 통과했습니다.

### CLI

- `npm test -- --run` → 21 files, 304 tests passed
- `npm run typecheck` → passed
- `npm run release:preflight` → passed
- `npm audit --omit=dev --audit-level=moderate` → found 0 vulnerabilities

### Backend

- `uv run --python 3.12 --locked --group dev ruff check .` → passed
- `uv run --python 3.12 --locked --group dev pytest tests` → 280 passed, 1 warning
- `agentfeed-dev ./scripts/test-all.sh` backend stage → passed, Alembic offline chain includes `018_cli_auth_session_approval_code`

### Frontend

- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → passed
  - typecheck
  - contract tests
  - Next production build
  - production dependency audit
- `npm run lint` → passed

### Cross-repo

- `agentfeed-dev ./scripts/test-all.sh` → All checks passed
  - CLI tests/typecheck/release preflight/audit
  - Frontend CI/audit
  - Backend ruff/tests/offline migration
  - OpenAPI contract gate
  - Actions SHA pin gate
  - OAuth static gates

## 남은 범위

> [!warning]
> Real hosted GitHub consent with the new approval-code UI remains a manual smoke until remote deployment/CI environment runs the browser path against hosted auth.

후속 확인 포인트:

- Remote GitHub Actions에서 Backend Postgres service live migration 실행 여부 확인
- Hosted Frontend에서 terminal approval code UX manual smoke
- Production secrets/Redis/Postgres quota/audit-log 운영 설정은 deploy environment에서 별도 확인

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[AgentFeed CLI MOC#핵심 노트]]
- [[Auth & Credential Safety]]
- [[Privacy Safety]]
- [[Integration - CLI Backend Frontend]]
- [[Commercial Readiness Hardening - Backend Publish Privacy Identity Defaults 2026-06-02]]
- [[Commercial Readiness Hardening - Frontend Review Feed Token Safety 2026-06-02]]
