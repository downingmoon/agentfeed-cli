---
title: Commercial Readiness Hardening - Windows DPAPI and Ingestion Quota 2026-06-03
aliases:
  - Windows DPAPI and Ingestion Quota
  - 2026-06-03 P1 Windows credentials ingestion quota
date: 2026-06-03
status: verified-local
repos:
  - AgentFeed-CLI
  - agentfeed-backend
  - agentfeed-frontend
  - agentfeed-dev
tags:
  - agentfeed/commercial-readiness
  - agentfeed/p1
  - obsidian/task
---

# Commercial Readiness Hardening - Windows DPAPI and Ingestion Quota 2026-06-03

## 범위

이번 패스는 [[Commercial Readiness Hardening - Login Provider Token and Interactive Evidence Gates 2026-06-03]] 이후 남은 로컬 P1 중 아래 두 가지를 처리했다.

- CLI Windows native secure credential storage readiness
- Backend `/v1/ingest/worklogs` durable post-auth quota

Frontend repo는 root route가 `LandingPage`이고 `src/middleware.ts`도 redirect를 만들지 않음을 재확인했다. 따라서 hosted `https://agentfeed.dev/ -> /login` 문제는 현재 코드가 아니라 배포/platform auth 설정 blocker로 유지한다.

> [!warning] Hosted blocker
> 2026-06-03 현재 `api.agentfeed.dev` DNS는 여전히 미해결이고, `https://agentfeed.dev/`는 `/login`으로 redirect된다. 이번 변경은 hosted blocker를 우회하지 않고, 로컬 제품/운영 안전성을 높인다.

## 변경 요약

### AgentFeed-CLI

- Windows `auto`/`keychain` credential store가 PowerShell + DPAPI encrypted payload를 사용하도록 구현.
- token은 PowerShell stdin으로만 전달하고 argv/env에 노출하지 않는다.
- encrypted payload는 `~/.agentfeed/<account>.dpapi`에 저장되고, metadata JSON에는 token plaintext를 저장하지 않는다.
- logout/delete는 DPAPI payload 파일을 삭제한다.

> [!note]
> 실제 Windows machine smoke는 아직 못 했고, macOS 환경에서 `process.platform === 'win32'` 및 child process helper를 mock해서 save/load/delete와 secret non-leakage를 검증했다.

### agentfeed-backend

- `ingestion_quota_events` durable table 추가.
- `/v1/ingest/worklogs` 신규 write 전에 UTC day 기준 user quota를 확인한다.
- 설정값 추가:
  - `INGEST_WORKLOGS_DAILY_QUOTA=1000`
  - `INGEST_WORKLOGS_DAILY_BYTES=52428800`
- over quota 시 `429 INGESTION_QUOTA_EXCEEDED`와 `Retry-After`를 반환한다.
- quota check 전에 기존 idempotent duplicate reuse를 확인하므로 같은 source 재전송은 quota를 소비하지 않는다.
- quota 집계 전에 user row `FOR UPDATE` lock을 잡아 동시 check-then-insert overshoot를 줄였다.

### agentfeed-frontend / agentfeed-dev

- Frontend local code check:
  - `src/app/page.tsx`는 `<LandingPage />`만 반환
  - `src/middleware.ts`는 CSP nonce만 설정하고 redirect 없음
- Dev `./scripts/test-all.sh`로 CLI/Backend/Frontend 통합 게이트 통과 확인.

## 검증 증거

> [!success] Local gates passed
> 아래 검증은 완료됐다.

- CLI
  - `npm test -- --run tests/keychain-env.test.ts tests/config.test.ts`
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Backend
  - `uv run --locked --group dev ruff check .`
  - `uv run --locked --group dev pytest tests/test_ingestion_quota.py -q`
  - `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'ingest or settings_require_positive_ingestion'`
  - `uv run --locked --group dev pytest -q`
  - `uv run --locked alembic upgrade head --sql`
- Frontend
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci`
- Dev
  - `./scripts/test-all.sh`

## 남은 작업

- [ ] `api.agentfeed.dev` DNS/deployment 복구 후 Frontend production API compatibility CI green 확인
- [ ] `agentfeed.dev/` hosted root stale `/login` redirect 제거 후 public landing smoke green 확인
- [ ] 실제 Windows machine에서 CLI DPAPI credential store smoke 실행
- [ ] self-hosted runner attached 상태 확인 또는 hosted equivalent evidence path 확정

## 관련 노트

- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
- [[Commercial Readiness Hardening - Login Provider Token and Interactive Evidence Gates 2026-06-03]]
- [[Commercial Readiness Hardening - Cache Workflow DNS and Production Secret Gates 2026-06-02]]
