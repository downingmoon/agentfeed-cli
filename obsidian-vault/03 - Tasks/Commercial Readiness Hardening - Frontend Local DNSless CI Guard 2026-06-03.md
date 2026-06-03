---
title: Commercial Readiness Hardening - Frontend Local DNSless CI Guard 2026-06-03
aliases:
  - Frontend Local DNSless CI Guard
  - Production API Compat Skip Guard
created: 2026-06-03
updated: 2026-06-03
status: done
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/ci
  - agentfeed/production-readiness
---

# Frontend Local DNSless CI Guard

> [!summary]
> `AGENTFEED_SKIP_PROD_API_COMPAT=1`가 너무 넓게 동작하면 hosted CI나 deploy preview에서 production API compatibility 검사를 조용히 우회할 수 있습니다. skip을 명시적 로컬 DNS-less 검증 전용으로 좁히고, GitHub/Vercel/Netlify 등 hosted CI/deploy 환경에서는 즉시 실패하도록 강화했습니다.

## Risk

- Production API compatibility check는 `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev`와 frontend contract가 실제로 맞는지 검증하는 마지막 안전망입니다.
- 단일 env flag만으로 이 검사를 비활성화하면, 잘못 주입된 CI secret/env 때문에 API drift가 green CI로 통과할 수 있습니다.
- 로컬에서는 현재 `api.agentfeed.dev` DNS가 unresolved라 deterministic cross-repo 검증을 위해 skip이 필요하지만, hosted CI/deploy에는 같은 예외를 허용하면 안 됩니다.

## Changes

- `agentfeed-frontend/scripts/run-ci.mjs`
  - `AGENTFEED_SKIP_PROD_API_COMPAT=1` 사용 시 `AGENTFEED_LOCAL_DNSLESS_CI=1`도 요구.
  - `GITHUB_ACTIONS`, `VERCEL`, `NETLIFY`, `CF_PAGES`, `RENDER`, `RAILWAY_ENVIRONMENT`, `FLY_APP_NAME`, `HEROKU_APP_NAME` 같은 hosted CI/deploy marker가 있으면 skip을 거부.
  - 거부 시 npm step 실행 전에 fail-fast diagnostic 출력.
- `agentfeed-frontend/scripts/run-ci.contract.test.mjs`
  - local DNS-less marker가 있을 때만 skip 허용하는 contract 추가.
  - marker 없는 skip과 hosted CI skip은 npm 호출 전에 실패해야 함을 고정.
- `agentfeed-frontend/scripts/check-api-compatibility.mjs`
  - DNS failure copy를 새 local marker 규칙에 맞춰 업데이트.
- `agentfeed-dev/scripts/test-all.sh`
  - deterministic local cross-repo gate는 `AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1`을 함께 사용.

## Verification

- `node scripts/run-ci.contract.test.mjs` → passed.
- `node scripts/check-api-compatibility.contract.test.mjs` → passed.
- `env NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 npm run ci` → failed before npm steps with `AGENTFEED_LOCAL_DNSLESS_CI=1` requirement.
- `env NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 npm run ci` → passed.
- `npm run test:contracts` → passed after sequential rerun.
- `npm run lint` → `tsc --noEmit` passed.
- `agentfeed-dev ./scripts/test-all.sh` → passed with the new `AGENTFEED_LOCAL_DNSLESS_CI=1` marker across CLI, Frontend, Backend, OpenAPI, and dev orchestration gates.

> [!warning] Hosted blocker remains
> This does not fix the external hosted blocker. `api.agentfeed.dev` still does not resolve and `https://agentfeed.dev/` still redirects to `/login`; hosted push CI should continue to fail until DNS/deploy readiness is fixed.

## Related

- [[Active Tasks]]
- [[Commercial Readiness Hardening - Frontend Following Feed Scope 2026-06-03]]
- [[Commercial Readiness Hardening - Hosted Failure Evidence 2026-06-02]]
- [[Commercial Readiness Hardening - Unified Readiness Gate 2026-06-02]]
