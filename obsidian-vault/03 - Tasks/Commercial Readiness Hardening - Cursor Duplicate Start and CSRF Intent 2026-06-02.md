---
title: Commercial Readiness Hardening - Cursor Duplicate Start and CSRF Intent 2026-06-02
aliases:
  - Cursor diagnostics duplicate reuse production start CSRF intent
  - 2026-06-02 ultrawork P1 hardening continuation
tags:
  - agentfeed/cli
  - agentfeed/backend
  - agentfeed/frontend
  - agentfeed/commercial-readiness
  - security
  - reliability
status: completed
created: 2026-06-02
completed: 2026-06-02
related:
  - "[[Active Tasks]]"
  - "[[Collection System]]"
  - "[[Runtime Configuration]]"
  - "[[Integration - CLI Backend Frontend]]"
---

# Commercial Readiness Hardening - Cursor Duplicate Start and CSRF Intent 2026-06-02

## 목적

상용화 readiness 병렬 감사에서 발견된 local-fixable P1 gap을 닫는다.

> [!important]
> 이번 slice는 hosted DNS/deploy blocker를 해결하지 않는다. 대신 로컬 코드/계약으로 해결 가능한 CLI 수집 정확도, Backend production start fail-fast, Frontend credentialed mutation intent를 강화한다.

## 변경

### CLI

- `agentfeed status`와 `agentfeed doctor`가 `last collection cursor`와 다음 기본 수집 시작점을 표시한다.
- pending local draft가 있는데 cursor가 이미 저장된 상태면 `--all`/`--since` recovery warning을 출력한다.
- duplicate draft fingerprint에 redacted `--note`를 반영해 note 변경 시 stale draft를 업로드하지 않는다.
- `--run-configured-commands`가 명시된 수집은 기존 draft를 재사용하지 않고 command/test evidence를 새로 수집한다.

### Backend

- `scripts/start-production.sh`가 `ENVIRONMENT=production|staging` 없이는 uvicorn을 실행하지 않고 fail-fast한다.
- README production deployment contract의 env 이름을 실제 설정명 `FRONTEND_URL`로 정렬했다.

### Frontend

- `apiFetch`가 non-GET/non-HEAD 요청에 `X-AgentFeed-CSRF: 1` intent header를 자동 추가한다.
- GET/HEAD는 header를 보내지 않아 read 요청의 단순성을 유지한다.

## 검증

- [x] CLI targeted: `npm test -- tests/duplicate-draft.test.ts tests/cli-status-doctor.test.ts --run && npm run typecheck`
- [x] CLI full: `npm test -- --run && npm run typecheck && npm run release:preflight` — 341 tests passed
- [x] Backend targeted: `bash -n scripts/start-production.sh` + `uv run --locked --group dev pytest tests/test_contracts.py -k 'production_startup_artifacts or production_deploy_env'`
- [x] Backend full: `uv run --locked --group dev ruff check app/main.py app/config.py tests/test_contracts.py && bash -n scripts/start-production.sh && uv run --locked --group dev pytest` — 311 tests passed
- [x] Frontend: `npm run lint && npm run test && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci`
- [x] Dev integration: `../agentfeed-dev/scripts/test-all.sh`

## 남은 외부 블로커

- `https://agentfeed.dev/`는 아직 `/login` redirect를 반환한다.
- `https://api.agentfeed.dev/v1/metadata`는 아직 DNS 미해결이다.
