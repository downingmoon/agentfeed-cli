---
title: Commercial Readiness Hardening - Cache Workflow DNS and Production Secret Gates 2026-06-02
aliases:
  - Cache Workflow DNS Production Secret Gates
  - 2026-06-02 P1 cache workflow DNS gates
created: 2026-06-02
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

# Commercial Readiness Hardening - Cache Workflow DNS and Production Secret Gates 2026-06-02

## 범위

이번 패스는 [[Commercial Readiness Hardening - Session Tail Cache Binding Auth Lockout and Prod API Gate 2026-06-02]] 이후 남은 P1 감사 항목 중, 로컬에서 즉시 보강 가능한 신뢰경계/게이트를 처리했다.

- CLI uploaded draft cache 재사용 조건을 현재 redacted payload + 현재 credential/API binding으로 재검증
- Backend production placeholder secret fail-fast 및 notification dedupe migration restart safety 보강
- Frontend hosted API compatibility가 DNS 장애를 명확히 fail-closed 진단하도록 보강
- Dev commercial readiness evidence에 workflow validity fallback gate와 repo state manifest 추가

> [!warning] Hosted blocker
> `https://api.agentfeed.dev/v1/metadata`는 여전히 DNS `ENOTFOUND` 상태이고, `https://agentfeed.dev/`는 hosted root에서 `/login`으로 redirect되는 stale deployment 증거가 남아 있다. 로컬/CI 게이트는 이 상태를 숨기지 않고 fail-closed로 드러내는 방향으로 유지한다.

## 변경 요약

### AgentFeed-CLI

- `cmdPublish`가 cached upload metadata만 보고 upload confirmation/API compatibility를 건너뛰지 않도록 변경.
- cache reuse는 다음 조건을 모두 만족할 때만 허용한다.
  - current draft를 redaction 후 계산한 payload hash와 cached payload hash 일치
  - current token/API binding hash와 cached credential binding hash 일치
  - review URL이 현재 API/review trust policy를 통과
- duplicate ingest reconciliation이 `/worklogs/:id/review`뿐 아니라 `/review/:id` URL에서도 worklog id를 복구한다.

### agentfeed-backend

- production settings가 checked-in placeholder/example 값을 거부하도록 `SECRET_KEY`, `DATABASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` 검증을 강화.
- `deploy.env.example`은 문서용 placeholder로 남기되 production settings instantiation은 실패하는 계약으로 전환.
- `015_notification_dedupe_key` migration에 `IF NOT EXISTS` / `IF EXISTS`를 적용해 partial run 이후 재시도 안전성을 높임.

### agentfeed-frontend

- `scripts/check-api-compatibility.mjs`가 hosted API host DNS preflight를 먼저 수행.
- `api.agentfeed.dev` 미해결 시 operator-actionable message로 실패하고, `AGENTFEED_SKIP_PROD_API_COMPAT=1`은 deterministic local/DNS-less CI 전용임을 명시.
- temp runner discovery에서 ENOENT race를 허용해 병렬 diagnostic 중 불필요한 실패를 줄임.

### agentfeed-dev

- `scripts/check-workflows.sh` 추가.
  - `actionlint`가 있으면 사용.
  - 없으면 no-new-dependency fallback으로 historical bug class인 job-level env의 `${{ runner.* }}` 사용을 차단.
- `scripts/test-workflow-validity.sh`로 fallback valid/invalid fixture 계약 고정.
- `scripts/commercial-readiness.sh` manifest에 dev/CLI/backend/frontend repo state(`branch`, `head`, `dirty`, `status_entries`) 기록.

## 검증 증거

> [!success] Local gates passed
> 아래 검증은 로컬에서 완료했다.

- CLI
  - `npm test -- --run tests/api-hook.test.ts tests/cli-share.test.ts`
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Backend
  - `uv run --locked --group dev ruff check app/config.py tests/test_contracts.py alembic/versions/015_notification_dedupe_key.py`
  - `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'production_deploy_env or notification_dedupe_migration'`
  - `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'production_settings or placeholder or production_secret'`
  - `uv run --locked alembic upgrade head --sql`
  - `uv run --locked --group dev ruff check app tests`
  - `uv run --locked --group dev pytest -q`
- Frontend
  - `git diff --check`
  - `node --check scripts/check-api-compatibility.mjs`
  - `node scripts/check-api-compatibility.contract.test.mjs`
  - `npm run test:contracts`
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run check:api-compatibility` expected-fail DNS diagnostic
  - `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci`
- Dev
  - `bash -n scripts/check-workflows.sh scripts/test-workflow-validity.sh scripts/commercial-readiness.sh scripts/test-all.sh scripts/test-commercial-readiness-gate.sh scripts/test-commercial-readiness-exec.sh`
  - `./scripts/check-workflows.sh`
  - `./scripts/test-workflow-validity.sh`
  - `./scripts/test-commercial-readiness-gate.sh`
  - `./scripts/test-commercial-readiness-exec.sh`
  - `./scripts/test-ci-integration-workflow.sh`
  - `./scripts/test-hosted-compatibility-smoke.sh`
  - `./scripts/test-all.sh`

> [!note]
> CLI full test를 Dev `test-all` 내부 CLI full test와 동시에 돌렸을 때 `tests/session-collector.test.ts` 1건이 timeout됐지만, 경합 해소 후 단독 `npm test`는 360 tests 전부 통과했다. Dev `test-all`도 같은 CLI repo에서 release preflight까지 통과했다.

## 남은 작업

- [ ] `api.agentfeed.dev` DNS/deployment 복구 후 Frontend production API compatibility CI green 확인
- [ ] `agentfeed.dev` hosted root stale `/login` redirect 제거 후 public landing smoke green 확인
- [ ] self-hosted runner 또는 equivalent hosted release evidence runner 구성 후 `make commercial-readiness` 실제 hosted evidence 수집

## 관련 노트

- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
- [[Commercial Readiness Hardening - Hosted Deployment Probe and CI API Explicitness 2026-06-02]]
- [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Session Tail Cache Binding Auth Lockout and Prod API Gate 2026-06-02]]
