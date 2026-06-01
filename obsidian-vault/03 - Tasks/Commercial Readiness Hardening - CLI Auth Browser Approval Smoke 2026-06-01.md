---
title: Commercial Readiness Hardening - CLI Auth Browser Approval Smoke 2026-06-01
aliases:
  - CLI Auth Browser Approval Smoke
  - Browser Login Approval Smoke Gate
  - CLI Auth Hydrated Approval QA
tags:
  - agentfeed/dev
  - agentfeed/cli
  - agentfeed/frontend
  - agentfeed/backend
  - agentfeed/security
  - agentfeed/commercial-readiness
  - project/tasks
status: done
created: 2026-06-01
updated: 2026-06-01
---

# Commercial Readiness Hardening - CLI Auth Browser Approval Smoke 2026-06-01

## 목적

[[Commercial Readiness Hardening - CLI Auth Session Metadata 2026-06-01]]에서 추가한 CLI auth session metadata UI를 실제 dev smoke가 hydrated browser에서 검증하도록 강화합니다.

> [!danger]
> CLI browser login은 사용자의 terminal에 ingestion token을 연결하는 보안 경계입니다. API contract만 통과해도 실제 브라우저 화면이 metadata를 보여주지 않거나 approve click이 실패하면 상용 로그인 UX가 깨질 수 있습니다.

## Acceptance Criteria

- [x] `scripts/smoke-e2e.sh`가 authenticated browser cookie로 `/cli/authorize?session_id=...`를 로드한다.
- [x] hydrated DOM에서 `AgentFeed CLI Login`, `CLI 세션`, device name, pending 상태, 승인 버튼을 검증한다.
- [x] browser click으로 `이 CLI 세션 승인`을 실행하고 승인 완료 문구를 검증한다.
- [x] Backend metadata endpoint에서 approve 후 `approved`, exchange 후 `consumed` 상태를 검증한다.
- [x] `scripts/test-all.sh` static gate가 이 smoke coverage가 제거되지 않도록 감시한다.
- [x] `agentfeed-dev` README가 smoke 범위를 최신화한다.
- [x] targeted/static/cross-repo validation이 통과한다.

## 변경 계획

1. `agentfeed-dev/scripts/smoke-e2e.sh`의 direct API approve를 browser DOM approval 경로로 대체.
2. smoke temp root를 browser approval 이전에 생성해 DOM dump helper가 로그/profile을 안전하게 쓸 수 있게 조정.
3. rotate auth session cleanup 누락도 같은 auth smoke 영역에서 정리.
4. dev static gate와 README를 업데이트.

## 관련 링크

- [[Active Tasks#P1 후보]]
- [[Auth & Credential Safety]]
- [[Integration - CLI Backend Frontend]]

## 구현 결과

- `agentfeed-dev/scripts/smoke-e2e.sh`가 CLI auth session 생성 후 direct API approve 대신 authenticated hydrated browser DOM을 열어 metadata를 검증하고 approve button을 클릭합니다.
- approve click 직후 metadata endpoint의 `approved` 상태를 확인하고, exchange 이후 `consumed` 상태까지 검증합니다.
- smoke helper temp root를 CLI auth browser check 이전에 생성하도록 이동했습니다.
- rotate session id도 cleanup 대상에 포함해 smoke 데이터 잔존 위험을 줄였습니다.
- `scripts/test-all.sh` static gate와 `agentfeed-dev/README.md` smoke 설명을 갱신했습니다.

## 검증 증거

- Targeted syntax/static:
  - `bash -n scripts/smoke-e2e.sh` → passed.
  - `node --check scripts/browser-dom-dump.mjs` → passed.
  - CLI auth browser approval smoke coverage grep gate → passed.
- Cross-repo integration:
  - `agentfeed-dev ./scripts/test-all.sh` → passed.
  - OpenAPI contract gate: operations 70 / client contracts 67.
  - CLI: 20 files / 280 tests, typecheck, release preflight, audit 0 vulnerabilities.
  - Frontend: typecheck, contract tests, production build, audit 0 vulnerabilities.
  - Backend: ruff, 256 pytest, Alembic offline migration chain.
- Live browser E2E:
  - `agentfeed-dev ./scripts/smoke-e2e.sh` → passed.
  - Worklog: `97df2710-89ae-4542-8c9b-876129038263`.

> [!success]
> CLI auth approval UI is now covered by a live hydrated browser smoke path, including metadata display, browser approve click, and server-side approved→consumed session transition.
