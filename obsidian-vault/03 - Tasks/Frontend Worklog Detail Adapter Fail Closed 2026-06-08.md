---
title: Frontend Worklog Detail Adapter Fail Closed 2026-06-08
aliases:
  - Worklog detail adapter fail closed
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/evidence
---

# Frontend Worklog Detail Adapter Fail Closed 2026-06-08

> [!success] 완료
> Worklog detail adapter가 strict API normalizer 이후의 malformed `outcome`/`timeline`/`social` payload를 다시 조용히 허용하거나 부분 목록으로 숨기지 않도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiWorklog.outcome`을 `ApiOutcomeItem[]`로 축소.
  - `ApiWorklog.timeline`을 `ApiTimelineItem[]`로 축소.
  - detail read normalizer가 이미 legacy string/null/malformed rows를 처리하므로 adapter type도 normalize 이후 형태와 일치시켰다.
- `agentfeed-frontend/src/lib/adapters.ts`
  - `adaptWorklog`에서 legacy outcome string 허용 제거.
  - malformed outcome/timeline rows를 `flatMap`으로 drop하지 않고 `Frontend adapter contract mismatch`로 fail-closed.
  - detail payload의 `social`, `outcome`, `timeline` 필수 normalized shape 확인을 강화.
- `agentfeed-frontend/src/hooks/useWorklog.ts`
  - adapter contract mismatch도 사용자-facing “response malformed” 오류로 노출.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid normalized outcome/timeline preserve 회귀 추가.
  - malformed outcome/timeline/social/null detail fields fail-closed 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - legacy outcome string 허용과 `flatMap` row-drop 재도입 방지 source guard 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] `safeUser`, `safeSocialStats`, `adaptMetrics`의 zero/empty fallback 중 API normalizer 이후에도 필요한 UI-only fallback과 contract masking을 분리 점검.
- [ ] Worklog detail browser smoke는 다음 UI/contract slice에서 로컬 또는 개인서버 배포 없이 dev server 기준으로 확인.
