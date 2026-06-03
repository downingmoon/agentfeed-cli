---
title: Commercial Readiness Hardening - Compatibility Evidence and CI Timeout 2026-06-03
aliases:
  - Frontend compatibility evidence and CI timeout
  - Public API probe evidence marker
  - Hung frontend CI fail-closed timeout
tags:
  - agentfeed/frontend
  - agentfeed/dev
  - agentfeed/ci
  - agentfeed/commercial-readiness
  - agentfeed/contracts
status: completed
created: 2026-06-03
related:
  - "[[Active Tasks]]"
  - "[[Commercial Readiness Hardening - Frontend Core API Compatibility Probes 2026-06-03]]"
---

# Compatibility Evidence and CI Timeout

> [!success] Outcome
> Frontend compatibility evidence is now explicit about which public API probes ran, and Frontend CI subprocesses fail closed instead of hanging indefinitely.

## 변경 사항

- `agentfeed-frontend/scripts/check-api-compatibility.mjs`
  - 성공 시 `FRONTEND_API_PROBES_PASSED metadata feed tags explore` marker를 출력한다.
  - `npx tsc` / compiled runner subprocess에 `AGENTFEED_API_COMPAT_COMMAND_TIMEOUT_MS` 기반 timeout을 적용한다.
  - timeout 시 operator-actionable message로 fail-closed 처리한다.
- `agentfeed-frontend/scripts/run-ci.mjs`
  - 모든 CI step subprocess에 `AGENTFEED_CI_STEP_TIMEOUT_MS` 기반 timeout을 적용한다.
  - hung gate는 exit `124`와 step label을 포함한 diagnostic으로 멈춘다.
- `agentfeed-dev/scripts/test-hosted-compatibility-smoke.sh` 및 `test-all.sh`
  - hosted compatibility smoke contract가 Frontend public API probe marker를 요구한다.

## 검증

- [x] Frontend `npm run test:contracts`
- [x] Frontend `npm run lint`
- [x] Frontend `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- [x] Frontend `npm run check:api-compatibility:mock`
- [x] Dev `./scripts/test-hosted-compatibility-smoke.sh`
- [x] `git diff --check`

## 남은 외부 블로커

> [!warning]
> Hosted readiness 실패 원인은 여전히 외부 배포/DNS 상태다: `api.agentfeed.dev` DNS 미해결 및 `https://agentfeed.dev/` root의 stale `/login` redirect.
