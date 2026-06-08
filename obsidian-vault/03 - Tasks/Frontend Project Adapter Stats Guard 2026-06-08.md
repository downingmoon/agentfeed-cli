---
title: Frontend Project Adapter Stats Guard 2026-06-08
aliases:
  - Project adapter stats guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/project
  - agentfeed/evidence
---

# Frontend Project Adapter Stats Guard 2026-06-08

> [!success] 완료
> Project adapters가 read-normalized `stats` object를 검증하고, Project detail의 missing/malformed stats를 0 값으로 숨기지 않도록 보강했다.

## 계약 판단

- Project summary list payload는 API normalizer상 `stats:null` 또는 missing이 허용된다.
  - 따라서 summary adapter의 empty stats 표현은 유지한다.
- Project detail payload는 `ApiProjectDetail.stats`가 필수 normalized object다.
  - 따라서 detail adapter에서 missing/malformed stats를 `0/null`로 합성하면 contract mismatch를 숨긴다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `assertNormalizedProjectStats` 추가.
  - Project summary는 `assertOptionalProjectStats`로 `stats:null`은 허용하되, stats object가 있으면 shape를 검증.
  - Project detail은 `assertNormalizedProjectStats`로 stats 필수 shape를 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid project detail stats preserve 회귀 추가.
  - Project summary malformed stats object fail-closed 회귀 추가.
  - Project summary `stats:null` empty state 허용 회귀 유지.
  - Project detail `stats:undefined/null/malformed/negative` fail-closed 회귀 추가.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - summary/detail project stats guard source regression 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] Project adapter의 `owner` optional 처리와 `owner_id` fallback이 current API contract와 UX routing 정책을 모두 만족하는지 추가 점검.
- [ ] Worklog source/viewer_state nullable 처리 중 API contract상 허용된 null과 masking fallback을 구분 점검.
