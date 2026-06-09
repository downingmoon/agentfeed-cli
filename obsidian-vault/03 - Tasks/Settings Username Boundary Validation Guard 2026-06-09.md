---
title: Settings Username Boundary Validation Guard 2026-06-09
date: 2026-06-09
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - quality-pass
status: done
aliases:
  - Settings Username Validation Guard
---

# Settings Username Boundary Validation Guard 2026-06-09

> [!success] Result
> Settings profile save helper가 DOM input pattern에만 의존하지 않고, Backend `SetUsernameRequest`와 같은 username 형식을 helper boundary에서 먼저 검증하도록 보강했다.

## 연결된 작업

- [[Profile Account Public Handle Display Guard 2026-06-09]]
- [[User Public Handle Display Guard 2026-06-09]]

## 배경

Backend는 `app/schemas/user.py`에서 username을 다음처럼 정규화/검증한다.

- trim + lowercase
- length 3..39
- pattern: `^[a-z0-9](?:[a-z0-9_-]*[a-z0-9])?$`

Frontend Settings UI에도 input pattern은 있었지만, 실제 저장 helper인 `saveSettingsProfile()`은 username 형식을 자체 검증하지 않았다. 이 경우 future UI 변경, 테스트/스크립트 호출, 또는 브라우저 validation 우회 상황에서 invalid username이 profile update 이후 username mutation 실패로 처리되어, 사용자가 의도하지 않은 partial profile save를 경험할 수 있다.

## 변경 범위

- `agentfeed-frontend/src/lib/settings-profile-save.ts`
  - Backend-aligned username constants 추가.
  - `validateSettingsUsername()` 추가.
  - `saveSettingsProfile()`이 profile mutation 전에 username을 검증하도록 변경.
- `agentfeed-frontend/src/lib/settings-profile-save.contract.test.ts`
  - invalid username format이면 profile API와 username API를 모두 호출하지 않는 회귀 테스트 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - helper boundary validation이 유지되도록 source contract 추가.

## 검증

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run check:api-compatibility:mock`
- [x] `AGENTFEED_SKIP_PROD_API_COMPAT=1 AGENTFEED_LOCAL_DNSLESS_CI=1 NEXT_PUBLIC_API_URL=https://api.agentfeed.dev NEXT_PUBLIC_REVIEW_BASE_URL=https://agentfeed.dev npm run ci`
- [x] `node scripts/check-openapi-contract.mjs` in `agentfeed-dev`

## 서버/배포

> [!info]
> Goal 필수 규칙에 따라 이번 pass에서는 서버 배포를 하지 않았다.

## 남은 확인

- [ ] Backend username validation constants와 Frontend helper constants를 OpenAPI/metadata로 더 직접 연결할 필요가 있는지 후속 검토.
- [ ] Settings form의 username validation copy가 한국어/영어 혼용 없이 product tone에 맞는지 카피 pass에서 점검.
