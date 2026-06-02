---
title: Commercial Readiness Hardening - Login Provider Token and Interactive Evidence Gates 2026-06-03
aliases:
  - Login Provider Token Interactive Evidence Gates
  - 2026-06-03 P1 login provider token gates
created: 2026-06-03
status: verified-local
repos:
  - AgentFeed-CLI
  - agentfeed-backend
  - agentfeed-dev
tags:
  - agentfeed/commercial-readiness
  - agentfeed/p1
  - obsidian/task
---

# Commercial Readiness Hardening - Login Provider Token and Interactive Evidence Gates 2026-06-03

## 범위

이번 패스는 [[Commercial Readiness Hardening - Cache Workflow DNS and Production Secret Gates 2026-06-02]] 이후 남은 P1 중 로컬에서 즉시 줄일 수 있는 release-readiness 리스크를 처리했다.

- CLI가 incompatible API에 대해 token/browser login 또는 rotate credentials를 저장하지 않도록 preflight gate 추가
- Backend가 GitHub OAuth provider access/refresh token을 더 이상 보관하지 않도록 non-retention 정책 적용
- Dev commercial-readiness evidence workflow가 interactive OAuth operator acknowledgement 없이는 fail-fast 하도록 보강

> [!warning] Hosted blocker
> 2026-06-03 현재도 `api.agentfeed.dev` DNS는 미해결이고 `agentfeed.dev/` hosted root는 `/login`으로 redirect된다. 이 노트의 변경은 hosted blocker를 우회하지 않고, 로컬/CI evidence가 더 명확히 실패하거나 credential/token retention risk를 낮추도록 한다.

## 변경 요약

### AgentFeed-CLI

- `agentfeed login --token-stdin` 저장 경로에서 `/v1/metadata` compatibility를 먼저 확인한다.
- `browserLogin()`은 credentials를 저장하거나 token replacement를 생성하기 전에 API compatibility를 확인한다.
- `agentfeed rotate`도 incompatible metadata 상태에서는 browser auth session을 만들지 않고 기존 credentials를 유지한다.
- `--no-save` token flow는 raw persistence가 없으므로 저장 전 compatibility gate 대상에서 제외한다.

### agentfeed-backend

- GitHub OAuth login 시 `AuthAccount.access_token_encrypted` / `refresh_token_encrypted`를 `NULL`로 유지한다.
- 기존 retained GitHub provider tokens를 migration `023_nullable_provider_access_token`에서 정리한다.
- fresh schema의 `auth_accounts.access_token_encrypted`도 nullable로 정렬한다.

> [!note]
> 기존 token encryption/decryption helper와 maintenance helper는 legacy data compatibility를 위해 남아 있지만, 정상 GitHub login path는 provider token을 새로 보관하지 않는다.

### agentfeed-dev

- manual **Commercial readiness evidence** workflow에 `operator_acknowledges_interactive_oauth` input 추가.
- input이 `true`가 아니면 cross-repo/OAuth secret check 단계에서 fail-fast한다.
- `AGENTFEED_OAUTH_LIVE_NO_OPEN=1`일 때 `AGENTFEED_OAUTH_LIVE_INTERACTIVE_ACK`가 없으면 `smoke-oauth-live.sh`가 fail-fast한다.
- README에 interactive OAuth acknowledgement 운용 방식을 명시했다.

## 검증 증거

> [!success] Local gates passed
> 아래 검증을 완료했다.

- CLI
  - `npx vitest run tests/api-hook.test.ts tests/cli-status-doctor.test.ts`
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Backend
  - `uv run --locked --group dev ruff check .`
  - `uv run --locked --group dev pytest tests/test_contracts.py -q -k 'provider_token or github_login'`
  - `uv run --locked --group dev pytest -q`
  - `uv run --locked alembic upgrade head --sql`
- Dev
  - `bash -n scripts/smoke-oauth-live.sh scripts/test-commercial-readiness-gate.sh scripts/test-all.sh`
  - `./scripts/test-commercial-readiness-gate.sh`
  - `./scripts/test-workflow-validity.sh`
  - `./scripts/check-workflows.sh`
  - `./scripts/test-all.sh`

> [!note]
> CLI full test를 Dev `test-all` 내부 release preflight와 동시에 돌렸을 때 1건 timeout이 있었지만, 경합 해소 후 단독 `npm test`는 363 tests 전부 통과했다. Dev `test-all` 내부에서도 CLI release preflight가 통과했다.

## 남은 작업

- [ ] `api.agentfeed.dev` DNS/deployment 복구 후 Frontend production API compatibility CI green 확인
- [ ] `agentfeed.dev/` hosted root stale `/login` redirect 제거 후 public landing smoke green 확인
- [ ] self-hosted runner attached 상태 확인 또는 hosted equivalent evidence path 확정
- [ ] Backend ingestion user/token durable quota 보강
- [ ] CLI Windows secure credential store 정책 결정 또는 Windows keychain 구현

## 관련 노트

- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
- [[Commercial Readiness Hardening - Cache Workflow DNS and Production Secret Gates 2026-06-02]]
- [[Commercial Readiness Hardening - Session Tail Cache Binding Auth Lockout and Prod API Gate 2026-06-02]]
