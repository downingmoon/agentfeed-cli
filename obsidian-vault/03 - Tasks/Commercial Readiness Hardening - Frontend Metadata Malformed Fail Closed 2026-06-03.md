---
title: Frontend Metadata Malformed Fail Closed
date: 2026-06-03
tags:
  - agentfeed/commercial-readiness
  - agentfeed/frontend
  - agentfeed/api-contract
  - agentfeed/metadata
status: completed
related:
  - "[[Active Tasks]]"
  - "[[Integration - CLI Backend Frontend]]"
  - "[[Commercial Readiness Hardening - API Compatibility Metadata Handshake 2026-06-02]]"
---

# Frontend Metadata Malformed Fail Closed

## 목표

Frontend runtime/API compatibility gate가 malformed `/v1/metadata` payload에서 TypeError로 깨지지 않고 명확하게 incompatible 상태로 fail-closed 처리되도록 한다.

> [!success]
> `isBackendCompatible()`가 `unknown` metadata를 받는 type guard가 되었고, `supported_clients`/`frontend`/version fields가 누락·오염된 payload를 throw 없이 `false`로 반환한다.

## 변경

- `agentfeed-frontend/src/lib/api.ts`
  - `isBackendCompatible(metadata: unknown): metadata is ApiMetadata`로 변경.
  - `supported_clients`와 `frontend` nested object를 shape-check 후 접근.
  - `service`, `api_version`, `contract_version`, frontend `contract_version`, `min_version`을 string guard 후 비교.
- `agentfeed-frontend/src/contexts/AppContext.tsx`
  - incompatible metadata error message가 malformed payload에서도 `unknown/unknown` fallback으로 안전하게 표시되도록 변경.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - null/array/missing `supported_clients`/malformed frontend client/version fields가 throw 없이 incompatible인지 검증.

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
