---
title: Frontend Review Privacy Validation Guard 2026-06-10
date: 2026-06-10
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - agentfeed/privacy
  - agentfeed/commercial-readiness
status: done
---

# Frontend Review Privacy Validation Guard 2026-06-10

> [!success]
> Worklog review 화면의 privacy finding 검증을 shared validator로 분리하고, raw string을 `ApiPrivacyFindingType` / `ApiPrivacySeverity`로 assertion하던 경계를 switch 기반 parser로 교체했다.

## 문제

- `WorklogReviewPage`가 privacy finding type/severity를 closed set으로 검사한 뒤에도 `as ApiPrivacyFindingType`, `as ApiPrivacySeverity`를 사용했다.
- page-local validator가 대형 review page 안에 있어 public review/publish 안전 로직과 UI 렌더링 책임이 섞여 있었다.
- review 화면은 publish 차단과 privacy scan fail-closed가 걸린 핵심 경로라 타입 경계가 더 명시적이어야 한다.

## 수정

- `src/lib/worklog-review-validation.ts`
  - `validatePrivacyFindings` 이동.
  - `validateReviewPublicFields` 이동.
  - `privacyFindingType`, `privacyFindingSeverity`를 switch 기반 parser로 구현해 assertion 제거.
  - privacy scan이 없거나 malformed이면 기존처럼 blocking synthetic finding 또는 explicit mismatch error로 fail-closed.
- `src/components/pages/WorklogReviewPage.tsx`
  - validator import로 page-local privacy validation 제거.
  - page pure LOC를 약 558급에서 473으로 축소.
- `src/lib/worklog-review-validation.contract.test.ts`
  - valid finding, unavailable scan fallback, unknown type/severity reject, public_fields reject를 직접 검증.
- `src/lib/worklog-review-publish.contract.test.ts`
  - `as ApiPrivacyFindingType` / `as ApiPrivacySeverity` 재도입 금지.
  - page+validator source를 함께 검사하도록 조정.
- `src/lib/page-source-contract.test.ts`
  - privacy validation 책임이 shared validator module에 있다는 구조로 갱신.

## 검증

- Red 확인
  - `worklog-review-publish.contract.test.ts` 확장 후 기존 `WorklogReviewPage.tsx`의 `as ApiPrivacyFindingType`에서 실패 확인.
- Green 확인
  - `npm run test:contracts`
  - `npm run lint`
  - `NEXT_PUBLIC_API_URL=http://localhost:8000 AGENTFEED_ALLOW_LOCAL_API_BUILD=1 AGENTFEED_LOCAL_DNSLESS_CI=1 AGENTFEED_SKIP_PROD_API_COMPAT=1 NEXT_TELEMETRY_DISABLED=1 npm run ci`
  - `node scripts/check-openapi-contract.mjs`
- Manual QA
  - `next dev -p 3103` 로컬 서버 실행.
  - Playwright route mock으로 `/worklogs/review-smoke/review` 렌더.
  - `Review validation smoke`, `Review finding smoke`, public field badge가 화면에 표시됨 확인.

## 검증 제약

> [!warning]
> TypeScript LSP diagnostics는 `typescript-language-server`가 설치되어 있지 않아 실행되지 않았다. 대신 `tsc --noEmit` 기반 lint/CI와 direct contract test로 검증했다.

## 배포

- 서버 배포는 하지 않았다.

## 후속 후보

- `src/lib/adapters.ts`의 `_author` 반환 assertion 제거 또는 명시 타입 생성.
- `src/hooks/useWorklog.ts`의 `_author` 접근 assertion 제거.
- `src/lib/collection-evidence.ts`의 agent type parser assertion을 switch/guard로 축소할 수 있는지 검토.
