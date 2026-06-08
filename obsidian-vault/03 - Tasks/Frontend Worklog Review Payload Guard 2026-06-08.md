---
title: Frontend Worklog Review Payload Guard 2026-06-08
aliases:
  - Worklog review payload guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/review
  - agentfeed/evidence
---

# Frontend Worklog Review Payload Guard 2026-06-08

> [!success] 완료
> `WorklogReviewPage.isUsableWorklogReview`가 review payload의 최소 필수 nested fields를 확인한 뒤 publish/review UI를 렌더링하도록 보강했다.

## 발견한 문제

- 기존 guard는 `worklog.id`, `worklog.status`, `worklog.visibility` 정도만 확인했다.
- API normalizer가 strict하더라도 page-level guard가 약하면 future bypass/refactor에서 malformed `preview`, `metrics`, `source`, safety flag가 render 단계까지 들어올 수 있다.

## 변경 요약

- `agentfeed-frontend/src/components/pages/WorklogReviewPage.tsx`
  - review worklog status enum: `needs_review`, `public`, `private`.
  - review visibility enum: `private`, `unlisted`, `public`.
  - required worklog fields: `id`, `title`, `summary`, `status`, `visibility`.
  - nullable worklog fields: `user_note`, `model`, `public_prompt`.
  - `worklog.metrics` object 필수.
  - `worklog.source`는 object/null/undefined만 허용.
  - preview 필수 fields: `card_title`, `card_summary`, `public_fields`, `safe_public_preview`.
  - `private_fields`는 string array/null/undefined만 허용.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - status/visibility enum guard, metrics object guard, preview safety/public_fields guard source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 배포 상태

> [!info] 서버 배포 안 함
> 현재 active goal 규칙에 따라 이번 slice는 개인 서버 배포를 수행하지 않았다.

## 후행 과제

- [ ] Project create/update 후 owner username missing 상태에서 route target이 의도대로 legacy project id route로 이동하는지 browser smoke 후보.
- [ ] Frontend page-level guards와 API normalizer 중복 범위를 줄일 수 있는 shared normalized validators 구조는 신규 abstraction 성격이 있으므로, 지금은 추가하지 않고 필요 시 별도 설계 문서화.
