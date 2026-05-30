---
title: Commercial Readiness Hardening - Release and Public Gates 2026-05-30
date: 2026-05-30
tags:
  - agentfeed/commercial-readiness
  - project/tasks
  - release/gate
status: implemented
aliases:
  - 2026-05-30 release package and public gates
---

# Commercial Readiness Hardening - Release and Public Gates 2026-05-30

> [!summary]
> CLI npm 배포 안전성, Frontend production/auth/privacy fail-closed, Backend project visibility 공개 surface, Dev 통합 게이트 재현성을 한 루프로 보강했습니다.

## 범위

- [[AgentFeed CLI MOC|CLI]] — npm package identity, package dry-run gate, reused draft privacy, implicit API base trust boundary
- [[Runtime Configuration]] — Frontend production API URL preflight와 runtime normalization
- [[Auth & Credential Safety]] — OAuth `next` allowlist, landing/header login entrypoint
- [[Privacy Safety]] — upload/public field redaction, privacy severity fail-closed, project metadata visibility fail-closed
- [[Integration - CLI Backend Frontend]] — Backend/Frontend/CLI contract와 `agentfeed-dev` release gate

## 구현 요약

### CLI release / upload safety

- npm registry의 unrelated `agentfeed` package collision을 피하기 위해 package name을 `agentfeed-cli`로 고정했습니다.
- 설치 후 사용자 command는 그대로 `agentfeed` bin을 유지합니다.
- `prepack`을 `clean → build → typecheck → test` 순서로 바꿔 stale `dist` 또는 stale test build artifact가 pack에 들어가지 않도록 했습니다.
- 테스트 build stamp를 `dist` 밖으로 옮기고, `dist/cli/index.js` 존재까지 확인해 clean 후 stale stamp 오판을 막았습니다.
- `collect/share --json`이 기존 matching draft를 재사용하더라도 stdout/upload 전에 draft public fields를 다시 scan/redact하고 저장합니다.
- privacy scan/redaction 대상에 `worklog.model`, `worklog.metrics`를 포함했습니다.
- repo-local `.env`에서 자동 발견한 `AGENTFEED_API_BASE_URL`은 loopback host만 신뢰합니다. 원격/production URL은 explicit env, `--api-base-url`, 또는 저장 credentials 경로로만 사용합니다.
- `BACKEND_PORT` 기반 자동 dev URL은 숫자 port(1-65535)만 허용합니다.

> [!important]
> package name은 `agentfeed-cli`, command name은 `agentfeed`가 현재 계약입니다. npm org/scoped package를 예약하기 전에는 변경하지 않습니다.

### Frontend production / auth / privacy gate

- production/Vercel production build에서 localhost API URL을 기본 차단하고, 명시적 `AGENTFEED_ALLOW_LOCAL_API_BUILD=1`일 때만 local build를 허용합니다.
- production API URL은 HTTPS를 요구합니다.
- `Header`를 root layout에 전역 mount해 public app에서도 login/search 진입점을 제공합니다.
- Landing CTA를 `/feed` 단순 이동 대신 GitHub OAuth 시작 action으로 연결했습니다.
- OAuth `next` query는 route별 allowlist만 보존하고 token/debug류 임의 query를 버립니다.
- publish privacy gate는 `high`, `critical`, 대문자 severity, unknown severity를 fail-closed로 차단합니다.

### Backend public visibility / reproducibility

- project visibility schema를 `private | unlisted | public | team` literal로 제한했습니다.
- public list/search/explore/trending surface는 `visibility == "public"`만 노출합니다.
- direct project/detail/worklog lookup은 `public`, `unlisted`, owner-owned project만 허용하고, unknown visibility는 fail-closed로 숨깁니다.
- public worklog card의 project metadata는 non-public project에서 `Private project` placeholder로 마스킹합니다.
- `uv.lock`과 `dev` dependency group을 추가해 Backend dev/test tooling을 lock 기반으로 재현 가능하게 했습니다.
- Backend README를 `uv sync --group dev`, `uv run --locked ...` 흐름으로 갱신했습니다.

### Dev release gate

- `agentfeed-dev/scripts/test-all.sh`가 CLI `npm pack --dry-run`을 포함합니다.
- Frontend production build gate는 production-safe `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev`로 실행합니다.
- Backend gate는 `uv run --locked --group dev ruff/pytest`와 locked Alembic offline chain을 사용합니다.

## 검증

> [!success]
> 아래 게이트가 모두 통과했습니다.

- CLI: `npm test -- --run` → 17 files / 158 tests passed
- CLI: `npm run typecheck` → passed
- CLI: `npm pack --dry-run --json` → `agentfeed-cli@0.2.0`, 110 files, prepack test gate passed
- Frontend: `npm run test:contracts` → passed
- Frontend: `npx tsc --noEmit --incremental false` → passed
- Frontend: `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` → passed
- Backend: `uv run --python 3.12 --locked --group dev ruff check .` → passed
- Backend: `uv run --python 3.12 --locked --group dev pytest tests -q` → 98 passed
- Dev shared gate: `../agentfeed-dev/scripts/test-all.sh` → CLI tests/typecheck/pack/audit, Frontend contracts/typecheck/audit/build, Backend Ruff/98 tests/Alembic offline chain passed

## 남은 P1 큐

> [!warning]
> 이번 루프는 release/public gate 중심 보강입니다. 아래는 다음 루프에서 계속 추적합니다.

- Backend GitHub OAuth account linking uniqueness / merge policy hardening
- CLI auth session exchange one-time transaction/race hardening
- Provider token legacy plaintext migration/remediation path 검증
- Shared DB rate-limit retention/pruning 정책
- Frontend rendered smoke assertion 강화
- End-to-end live smoke 재실행과 로그인 UX visual check

## 관련 링크

- [[Commercial Readiness Audit 2026-05-30]]
- [[Active Tasks]]
- [[Integration - CLI Backend Frontend]]
- [[Privacy Safety]]
- [[Auth & Credential Safety]]
- [[Runtime Configuration]]
