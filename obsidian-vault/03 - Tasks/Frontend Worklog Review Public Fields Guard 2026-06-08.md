---
title: Frontend Worklog Review Public Fields Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog-review
aliases:
  - Worklog review public fields guard
---

# Frontend Worklog Review Public Fields Guard 2026-06-08

## 결론

Worklog Review page가 `preview.public_fields`를 렌더링할 때 page-local `safeStringList()`로 비배열을 `[]`로 바꾸거나 blank string을 filter로 제거할 수 있었다. Backend `WorklogReviewPreview.public_fields`는 list contract이고, API boundary도 array type을 검증하므로 page layer에서 다시 빈 목록으로 합성하면 malformed successful payload를 조용히 숨길 수 있다.

> [!success] 수정 완료
> `safeStringList()`를 제거하고 `validateReviewPublicFields()`로 전환했다. review가 아직 로드되지 않은 초기 상태만 빈 배열을 허용하고, 실제 review payload가 있으면 `public_fields`가 non-empty string array인지 검증한다.

## 수정 범위

- `agentfeed-frontend/src/components/pages/WorklogReviewPage.tsx`
  - `safeStringList()` 제거.
  - `isStringList()`를 `isNonEmptyStringList()`로 강화.
  - `preview.public_fields`와 `preview.private_fields` item이 blank string이면 malformed review payload로 처리.
  - 렌더 전 `validateReviewPublicFields(review.preview.public_fields)` 적용.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `safeStringList` 재도입 방지.
  - blank `public_fields` filter 제거 회귀 방지.
  - `validateReviewPublicFields()` source guard 추가.

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

- Worklog Review publish/unpublish mutation response가 page-local fallback 없이 `worklog action response` API boundary contract를 그대로 신뢰하는지 다음 slice에서 확인한다.
- Frontend에서 `?? []`가 UI-only initial state인지, API success payload masking인지 계속 구분한다.

## 관련 노트

- [[Frontend Worklog Review Privacy Finding Guard 2026-06-08]]
- [[Frontend Worklog Review Payload Guard 2026-06-08]]
- [[Worklog Review Response Guard 2026-06-08]]
- [[Active Tasks]]
