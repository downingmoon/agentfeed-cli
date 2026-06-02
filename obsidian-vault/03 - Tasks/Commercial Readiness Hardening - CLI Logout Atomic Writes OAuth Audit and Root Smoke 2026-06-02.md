---
title: Commercial Readiness Hardening - CLI Logout Atomic Writes OAuth Audit and Root Smoke 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/commercial-readiness
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - hardening
status: done
aliases:
  - CLI logout atomic writes and auth audit
---

# Commercial Readiness Hardening - CLI Logout Atomic Writes OAuth Audit and Root Smoke 2026-06-02

> [!summary]
> 이번 패스는 로컬 토큰 종료 UX, 로컬 상태파일 손상 방지, 브라우저 OAuth 로그인 감사 추적, hosted root `/login` stale redirect 회귀 방지를 상용화 P1로 묶어 처리했다.

## 변경 사항

### CLI

- `agentfeed logout` / `agentfeed logout --json` 추가.
- 저장 credentials 파일을 제거하고, keychain metadata가 있으면 keychain delete도 시도한다.
- `AGENTFEED_TOKEN`이 환경변수로 남아 있으면 logout 후에도 명시적으로 경고한다.
- credentials/config/state/draft JSON/text writes를 atomic temp-file + rename 경로로 보강했다.

### Backend

- GitHub browser OAuth callback 성공 시 `auth.login` audit event를 기록한다.
- audit metadata는 `auth_method`, `next_path`, GitHub user id/login만 포함하고 provider access token은 저장하지 않는다.

### Frontend

- `npm run smoke:root-login` 추가.
- smoke는 root URL을 `redirect: manual`로 요청해 HTTP 200 landing page를 검증하고 `/login` 또는 기타 redirect를 fail-closed 처리한다.
- contract test가 성공/`/login` redirect/기타 redirect/landing marker 누락을 모두 검증한다.
- source contract가 `src/app/page.tsx`의 direct landing render와 `/login` redirect 금지를 고정한다.

### Dev orchestration

- `scripts/test-all.sh`가 frontend `smoke:root-login` script와 `ROOT_LOGIN_SMOKE_PASSED` marker 존재를 확인한다.

## 검증 증거

> [!success] Local verification
> - CLI: `npm test -- --run` → 22 files / 335 tests passed.
> - CLI: `npm run typecheck && npm run build` → passed.
> - Backend: `uv run --locked --group dev pytest` → 296 passed, 1 warning.
> - Backend: `uv run --locked --group dev ruff check app tests` → passed.
> - Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` → typecheck, contracts, mock compatibility, production build passed.
> - Dev: `./scripts/test-all.sh` → cross-repo local gate passed.
> - Frontend fail-closed smoke sanity: unreachable `AGENTFEED_ROOT_SMOKE_URL=http://127.0.0.1:1/` returned `ROOT_LOGIN_SMOKE_FAILED`.
> - Hosted check: `AGENTFEED_ROOT_SMOKE_URL=https://agentfeed.dev npm run smoke:root-login` → `ROOT_LOGIN_SMOKE_FAILED https://agentfeed.dev redirected to /login (307)`.
> - Hosted API DNS check: `api.agentfeed.dev` still failed local `socket.getaddrinfo`.

## 남은 리스크

> [!warning]
> Hosted release blocker는 아직 외부 배포/DNS 상태에 달려 있다. `https://agentfeed.dev/` stale `/login` redirect와 `api.agentfeed.dev` DNS/deployment 준비가 끝나야 default `make commercial-readiness`가 최종 pass 할 수 있다.

## 관련

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Secret No-Store and Commercial Evidence Workflow 2026-06-02]]
- [[Commercial Readiness Hardening - Hosted Frontend Deployment Smoke 2026-06-02]]
- [[Commercial Readiness Hardening - Audit Trail CI Fail Closed and Supply Chain Gate 2026-06-02]]
