---
title: Commercial Readiness Hardening - Frontend Hosted HTTPS Readiness Gate 2026-06-04
aliases:
  - Frontend hosted HTTPS readiness gate
  - Hosted readiness plaintext HTTP fail closed
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/security
  - obsidian/task
status: done
created: 2026-06-04
---

# Commercial Readiness Hardening - Frontend Hosted HTTPS Readiness Gate 2026-06-04

> [!summary]
> Frontend hosted readiness preflight now rejects non-local plaintext `http://` API/frontend URLs before network checks, while preserving `localhost`, `127.0.0.1`, and `::1` HTTP for local contract harnesses.

## 변경 요약

- `scripts/hosted-readiness-preflight.mjs`
  - Hosted readiness URL policy를 명시화했습니다.
  - `https:` 또는 local HTTP만 허용합니다.
  - Non-local `http://` API/Frontend URL은 fail-closed 합니다.
- `scripts/hosted-readiness-preflight.contract.test.mjs`
  - Non-local plaintext HTTP hosted URL 거부 regression을 추가했습니다.
  - 기존 local `127.0.0.1` contract harness 성공 경로는 유지됩니다.
- `next.config.ts`
  - `poweredByHeader: false`로 `X-Powered-By` fingerprinting header를 비활성화했습니다.
- `src/lib/page-source-contract.test.ts`
  - `poweredByHeader: false` source contract를 추가했습니다.

## 검증

- `node scripts/hosted-readiness-preflight.contract.test.mjs`
- `npm run test:contracts`
- `npm run lint`
- `npm run check:api-compatibility:mock`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build`
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 npm run ci`

> [!warning]
> Live hosted CI는 여전히 `api.agentfeed.dev` DNS/deployment와 hosted root `/login` redirect 외부 blocker가 해소되어야 strict green을 확인할 수 있습니다.

## 연결 문서

- [[Active Tasks]]
- [[AgentFeed CLI MOC]]
- [[Commercial Readiness Hardening - Frontend Review Origin Cross Validation 2026-06-04]]
