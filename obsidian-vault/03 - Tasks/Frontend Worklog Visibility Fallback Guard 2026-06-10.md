---
title: Frontend Worklog Visibility Fallback Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/enterprise-readiness
status: done
aliases:
  - Worklog card visibility fallback guard
---

# Frontend Worklog Visibility Fallback Guard 2026-06-10

> [!success]
> Frontend worklog card adapter가 API에서 이미 strict parser로 검증된 `visibility` 값을 다시 cast하거나 `public` fallback으로 합성하지 않도록 보강했다.

## 배경

[[Active Tasks]]의 후속 hardening 항목 중 Frontend public API type이 broad `string`이나 fallback으로 다시 열리는지 점검했다. `src/lib/adapters.ts`의 `adaptWorklogCard()`에서 다음 패턴이 남아 있었다.

```ts
visibility: (w.visibility as Worklog['visibility']) ?? 'public'
```

이 값은 `ApiWorklogCard.visibility`가 이미 `ProjectVisibility` union으로 fail-closed 정규화된 뒤 들어오는 값이다. 따라서 adapter가 다시 cast하거나 `public`으로 fallback하면 계약 drift 또는 malformed payload를 UI에서 숨길 수 있다.

## 변경

- `agentfeed-frontend` commit `2ddd815 Stop synthesizing worklog card visibility`
- `adaptWorklogCard()`가 `visibility: w.visibility`를 그대로 사용하도록 변경.
- `src/lib/adapters-source-contract.test.ts` 추가.
  - worklog card adapter가 visibility cast/fallback 패턴을 다시 도입하면 `npm run test:contracts`가 실패한다.
- `scripts/run-contract-tests.mjs`에 새 source contract를 등록.

## 검증

- Red check: 새 source contract가 기존 cast/fallback에서 실패하는 것 확인.
- `npm run test:contracts` 통과.
- `npm run lint` 통과.
- `npm run check:api-compatibility:mock` 통과.
- `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_TELEMETRY_DISABLED=1 npm run ci` 통과.
- `NEXT_PUBLIC_API_URL=http://161.33.171.81:18080 NEXT_PUBLIC_REVIEW_BASE_URL=http://161.33.171.81:13030 NEXT_PUBLIC_AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API=1 AGENTFEED_ALLOW_INSECURE_SERVER_TEST_API_BUILD=1 NEXT_TELEMETRY_DISABLED=1 npm run build` 통과.
- `node scripts/check-openapi-contract.mjs` 통과.

> [!note]
> 이번 pass에서는 active goal rule에 맞춰 서버 배포를 수행하지 않았다.

## 후속 작업

- [ ] `adaptWorklogCard()`의 반환부에 남아 있는 `as Worklog & { _author: User }` assertion도 별도 pass에서 adapter return type 구조를 정리하며 제거 가능한지 점검한다.
- [ ] `SettingsPage`, `ProjectsPage`, `ProjectDetailPage`의 select handler에 남아 있는 visibility type assertion은 oversized page split 또는 shared select parser 도입과 함께 별도 pass에서 처리한다.
