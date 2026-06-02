---
title: Commercial Readiness Hardening - Native Dev Config and Copy Status A11y 2026-06-02
date: 2026-06-02
tags:
  - agentfeed/dev
  - agentfeed/frontend
  - agentfeed/runtime-config
  - agentfeed/accessibility
  - agentfeed/commercial-readiness
status: completed
aliases:
  - Native dev config and copy status a11y
  - dev-native env parity and Worklog copy live region
---

# Native dev config and copy status a11y

> [!success]
> Docker 없는 `make dev-native` 경로가 `.env`의 Backend/Frontend 포트와 API URL을 실제 실행 명령에 반영하도록 보강했고, Worklog detail public prompt copy 피드백을 버튼 `aria-live`가 아닌 dedicated `role="status"` live region으로 이동했습니다.

## Context

- 상위 목표: [[Active Tasks#P1 후보]]
- Runtime config area: [[Runtime Configuration]]
- Cross-repo integration area: [[Integration - CLI Backend Frontend]]
- Frontend accessibility precedent: [[Commercial Readiness Hardening - Frontend Detail Profile Leaderboard Accessibility 2026-06-01]]

## Problem

### `agentfeed-dev` native runtime config drift

`agentfeed-dev/scripts/dev-native.sh`는 `.env.example`과 README가 `BACKEND_PORT`, `FRONTEND_PORT`, `NEXT_PUBLIC_API_URL`, `AGENTFEED_API_BASE_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS`를 설정 가능한 계약으로 안내하는데도 실제 native boot에서는 `localhost:3000`과 `localhost:8000`을 하드코딩했습니다.

> [!warning]
> Compose 경로는 env 기반이지만 native 경로가 설정을 무시하면, 3000/8000 충돌을 피하려는 사용자가 Frontend와 Backend를 서로 다른 root로 띄우게 됩니다. 상용 온보딩과 local QA 재현성을 떨어뜨리는 gap입니다.

### Worklog copy feedback live region mismatch

Worklog detail의 public prompt copy 버튼은 `aria-live="polite"`를 버튼 자체에 달고 있었습니다. Screen reader announcement는 interactive control이 아니라 dedicated status/live region에서 제공하는 쪽이 더 예측 가능하므로, source contract도 단순 `aria-live` 문자열 존재가 아니라 위치/semantics를 검증해야 합니다.

## Contract

1. `dev-native.sh`는 `ENV_FILE`을 source하고 다음 값을 실제 process 환경과 port 인자로 반영합니다.
   - `BACKEND_PORT`
   - `FRONTEND_PORT`
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `FRONTEND_URL`
   - `ALLOWED_ORIGINS`
   - `ENVIRONMENT`
   - `NEXT_PUBLIC_API_URL`
   - `AGENTFEED_API_BASE_URL`
2. native boot 전에 `scripts/check-api-base-parity.sh`로 Frontend/CLI API root split-brain을 fail-closed 처리합니다.
3. `scripts/test-dev-native-config.sh`는 stubbed `docker`/`uv`/`npm`으로 실제 인자와 env propagation을 검증합니다.
4. Worklog detail copy button은 `aria-live`를 직접 소유하지 않습니다.
5. Copy feedback은 `role="status" aria-live="polite" aria-atomic="true"` live region에서 `Prompt copied`를 announce합니다.

## Changes

### agentfeed-dev

- `scripts/dev-native.sh`
  - `ENV_FILE` source 후 env defaults를 계산합니다.
  - `BACKEND_PORT`와 `FRONTEND_PORT`를 `uvicorn --port`와 `npm run dev -- --port`에 전달합니다.
  - `NEXT_PUBLIC_API_URL` / `AGENTFEED_API_BASE_URL` parity check를 native boot gate로 추가했습니다.
- `scripts/test-dev-native-config.sh`
  - stubbed command harness로 native script가 `.env` 값을 propagation하는지 검증합니다.
  - 기존 8000/3000 하드코딩이 남으면 실패합니다.
- `scripts/test-all.sh`
  - native config contract를 전체 dev gate에 추가했습니다.

### agentfeed-frontend

- `src/components/pages/WorklogDetailPage.tsx`
  - Public prompt copy control 주변에 dedicated status live region을 추가했습니다.
  - Copy button은 `aria-label`로 현재 action/result를 제공하지만 live announcement는 status region에 위임합니다.
- `src/lib/page-source-contract.test.ts`
  - copy button의 `aria-live` 직접 보유를 금지합니다.
  - dedicated `role="status" aria-live="polite" aria-atomic="true"` 존재를 요구합니다.

## Verification evidence

> [!example] RED — native config contract
> `./scripts/test-dev-native-config.sh` failed before implementation with `backend must inherit FRONTEND_URL from ENV_FILE`; captured `uv.log` still had `FRONTEND_URL:http://localhost:3000`, `ALLOWED_ORIGINS:http://localhost:3000,http://localhost:3001`, and `--port 8000`.

> [!example] RED — frontend a11y contract
> `npm run test` failed after contract tightening with `worklog detail copy prompt button must not own the live announcement region`.

> [!success] GREEN — targeted dev contract
> `./scripts/test-dev-native-config.sh && ./scripts/test-api-base-parity.sh && bash -n scripts/dev-native.sh scripts/test-dev-native-config.sh scripts/test-all.sh` passed.

> [!success] GREEN — frontend contracts/build
> `npm run test && npm run lint && NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run ci` passed.

> [!success] GREEN — frontend dependency audit
> `npm audit --omit=dev --audit-level=moderate` passed with 0 vulnerabilities.

> [!success] GREEN — cross-repo dev gate
> `./scripts/test-all.sh` passed, covering CLI 327 tests/typecheck/release preflight/full audit, Frontend CI + audit, Backend Ruff + 289 tests + Alembic offline migration chain.

## Remaining risk

> [!warning]
> This loop closes local native runtime config parity and one static/semantic accessibility contract. It does not remove the external hosted DNS/deployment blocker for `api.agentfeed.dev`, and it does not replace a future manual screen-reader smoke pass for copy announcement behavior.

## Follow-up candidate

> [!todo]
> CLI review URL side-effect handoff can be further hardened by making `handoffReviewUrl` itself policy-aware, even though current upload response parsing already validates review URLs before side effects.

## Links

- [[AgentFeed CLI MOC]]
- [[Active Tasks]]
- [[Runtime Configuration]]
- [[Integration - CLI Backend Frontend]]
