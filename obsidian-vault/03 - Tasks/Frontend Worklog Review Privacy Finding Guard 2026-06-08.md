---
title: Frontend Worklog Review Privacy Finding Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/privacy
aliases:
  - Worklog review privacy finding guard
---

# Frontend Worklog Review Privacy Finding Guard 2026-06-08

## 결론

Worklog Review page의 page-local `safePrivacyFindings()`가 malformed privacy finding row를 `flatMap`으로 drop하거나, `id/type/severity/message`를 fallback 값으로 합성할 수 있었다. Backend/Frontend API boundary는 이미 privacy finding contract를 검증하지만, page-local helper가 future refactor나 bypass 상황에서 malformed row를 정상 UI처럼 보이게 만들 여지가 있었다.

> [!success] 수정 완료
> privacy finding helper를 strict `validatePrivacyFindings()`로 전환했다. `privacy_scan` 자체가 없을 때는 publish 차단용 visible sentinel을 유지하지만, finding row가 object가 아니거나 필수 필드가 비어 있거나 `resolved`가 boolean이 아니면 `Malformed review payload`로 fail-closed 한다.

## 수정 범위

- `agentfeed-frontend/src/components/pages/WorklogReviewPage.tsx`
  - malformed finding row drop 제거.
  - fallback finding id/type/severity/message 합성 제거.
  - reload 직후 finding validation을 수행해 malformed review payload가 state에 저장되지 않도록 보강.
  - publish 직전 fresh review에서도 strict finding validation을 재수행.
- `agentfeed-frontend/src/lib/worklog-review-publish.contract.test.ts`
  - fresh review findings 재검증 helper 이름/정책 갱신.
  - `flatMap` row-drop, fallback id 합성 회귀 방지 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Worklog Review privacy finding rendering 전 strict validation source guard 추가.

## 검증 evidence

- Frontend
  - `npm run test:contracts && npm run lint`
  - 결과: 통과.
- Backend
  - `uv run pytest && uv run ruff check .`
  - 결과: 400 tests passed, 1 warning, ruff 통과.
- CLI
  - `npm run release:preflight`
  - 결과: 27 test files, 562 tests passed, release preflight passed.

## 후행 과제

- `safeStringList(review?.preview.public_fields)`는 API boundary와 `isUsableWorklogReview()`가 이미 string array를 검증하지만, page-local fallback이 future bypass에서 어떤 UX를 만드는지 추가 audit 여지가 있다.
- `WorklogReviewPage`의 publish/unpublish action response path도 mutation adapter 수준으로 page-local fallback이 없는지 다음 slice에서 확인한다.

## 관련 노트

- [[Frontend Worklog Review Payload Guard 2026-06-08]]
- [[Worklog Review Response Guard 2026-06-08]]
- [[Frontend Worklog Detail Array Contract Guard 2026-06-08]]
- [[Active Tasks]]
