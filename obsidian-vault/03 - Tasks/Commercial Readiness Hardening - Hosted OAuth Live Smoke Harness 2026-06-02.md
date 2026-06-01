---
title: Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02
aliases:
  - Hosted OAuth Live Smoke Harness
  - GitHub OAuth Browser Login Manual Smoke
  - CLI Browser Login Hosted Callback Smoke
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/auth
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-02
updated: 2026-06-02
---

# Commercial Readiness Hardening - Hosted OAuth Live Smoke Harness 2026-06-02

## 목적

[[Integration - CLI Backend Frontend#남은 검증 리스크]]에 남아 있던 GitHub hosted OAuth / CLI browser-login happy path는 GitHub 사용자 세션과 consent screen이 필요해 완전 자동화가 어렵습니다. 대신 수동 검증을 재현 가능한 one-command smoke로 고정해, 남은 리스크를 "사람의 GitHub 로그인 클릭"으로만 좁힙니다.

> [!important]
> 이 smoke는 임시 `HOME`과 file credential store를 사용하므로 사용자의 일반 AgentFeed credentials를 수정하지 않습니다. GitHub hosted login/callback은 실제 브라우저에서 사용자가 완료해야 합니다.

## 변경 사항

- `agentfeed-dev/scripts/smoke-oauth-live.sh`
  - dev stack readiness와 migration-ready backend를 확인합니다.
  - `.env`의 `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI` 존재와 local callback URI 정합성을 검증합니다.
  - local packaged CLI entrypoint를 build한 뒤 temporary `HOME`에서 `agentfeed login --api-base-url ... --browser`를 실행합니다.
  - browser-login 성공 후 임시 credentials 파일의 API base, token prefix, private permissions를 검증합니다.
  - `agentfeed doctor`로 exchanged ingestion token이 실제 Backend에서 valid인지 확인합니다.
  - 성공 시 `OAUTH_LIVE_SMOKE_PASSED` sentinel을 출력합니다.
- `agentfeed-dev/Makefile`
  - `make smoke-oauth-live` target을 추가했습니다.
- `agentfeed-dev/scripts/test-all.sh`
  - live OAuth smoke harness가 유지되는지 `bash -n`과 static contract로 확인합니다.

## 실행 방법

```bash
cd ../agentfeed-dev
make up
make smoke-oauth-live
```

브라우저가 열리면 GitHub login/consent를 완료하고, 터미널이 `OAUTH_LIVE_SMOKE_PASSED`를 출력하는지 확인합니다.

옵션:

```bash
AGENTFEED_OAUTH_LIVE_NO_OPEN=1 make smoke-oauth-live
AGENTFEED_SMOKE_KEEP=1 make smoke-oauth-live
```

## 검증 증거

> [!success]
> 자동화 가능한 부분은 local static/cross-repo gate에 포함했고, hosted GitHub round-trip은 위 명령으로 재현 가능하게 고정했습니다.

- RED: `agentfeed-dev ./scripts/test-all.sh` → `scripts/smoke-oauth-live.sh: No such file or directory`
- GREEN static:
  - `bash -n scripts/smoke-oauth-live.sh`
  - `bash -n scripts/smoke-e2e.sh`
  - static contract: `smoke-oauth-live` Make target, temp file credential store, `ingestion token valid: yes`, `OAUTH_LIVE_SMOKE_PASSED`
- Full cross-repo gate:
  - `agentfeed-dev ./scripts/test-all.sh` → passed
  - 후속 자동 OAuth callback/session exchange evidence: [[Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02#검증 증거]]

## 남은 범위

> [!warning]
> 실제 GitHub hosted login/callback 완료는 사용자의 GitHub browser session과 consent가 필요합니다. 따라서 완전 자동 완료가 아니라 one-command manual smoke harness로 관리합니다.

- 자동화 완료: OAuth start redirect/state-cookie, CLI auth session exchange, authenticated `/cli/authorize` approve click, token validity, share/review/publish smoke
- 수동 smoke: `make smoke-oauth-live`로 실제 GitHub hosted login/callback을 완료하고 `OAUTH_LIVE_SMOKE_PASSED` 확인

## 관련 링크

- [[Commercial Readiness Hardening - OAuth Contract Smoke and Action Pinning 2026-06-02]]
- [[Commercial Readiness Hardening - Live Share Hydrated Smoke Revalidation 2026-06-02]]
- [[Integration - CLI Backend Frontend#남은 검증 리스크]]
- [[Auth & Credential Safety]]
- [[Active Tasks#P1 후보]]
