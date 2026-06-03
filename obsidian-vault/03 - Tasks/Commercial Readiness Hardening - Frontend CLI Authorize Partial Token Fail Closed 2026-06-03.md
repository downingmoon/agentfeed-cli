---
title: Frontend CLI Authorize Partial Token Fail Closed
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/cli-auth
  - agentfeed/privacy
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Auth & Credential Safety]]"
---

# Frontend CLI Authorize Partial Token Fail Closed

## 목표

`/cli/authorize`가 `session_id`와 `status_token`을 반드시 한 쌍으로 취급하게 만들어, 부분 URL이나 조작된 URL이 이전 `sessionStorage` 세션과 섞여 잘못된 CLI approval flow로 이어지지 않게 한다.

> [!success]
> `session_id`/`status_token` 중 하나만 들어온 경우 저장된 CLI authorize 세션을 폐기하고 visible URL에서 민감 파라미터를 제거한 뒤 에러 상태로 fail-closed 한다.

## 변경

- `agentfeed-frontend/src/components/pages/CliAuthorizePage.tsx`
  - visible URL cleanup 조건에 `status_token` 단독 노출도 포함.
  - incoming CLI auth parameter가 부분적으로만 존재하면 `sessionStorage` fallback을 금지.
  - partial pair 감지 시 저장된 one-time session metadata를 지우고 `/cli/authorize`로 URL을 정리.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `status_token` URL cleanup, partial pair detection, stored session fallback 금지를 source contract로 고정.

## 검증

```bash
npm run test:contracts
npm run lint
NEXT_PUBLIC_API_URL=https://api.agentfeed.dev AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 npm run ci
```

결과:

- contract tests passed
- `tsc --noEmit` passed
- production dependency audit: 0 vulnerabilities
- mock API compatibility: `FRONTEND_API_PROBES_PASSED metadata feed tags explore`
- production build passed

## 남은 리스크

- hosted 상용 readiness는 여전히 외부 배포/DNS에 막혀 있다.
  - `api.agentfeed.dev` DNS unresolved
  - `https://agentfeed.dev/` root stale `/login` redirect
