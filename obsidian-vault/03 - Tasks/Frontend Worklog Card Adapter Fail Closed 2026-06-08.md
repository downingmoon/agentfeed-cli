---
title: Frontend Worklog Card Adapter Fail Closed 2026-06-08
aliases:
  - Worklog card adapter fail closed
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/worklog
  - agentfeed/evidence
---

# Frontend Worklog Card Adapter Fail Closed 2026-06-08

> [!success] 완료
> Worklog card/list adapter가 strict API normalizer 이후의 `author`, `metrics`, `social` payload를 fallback user/zero stats/empty metrics로 다시 숨기지 않도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/api.ts`
  - `ApiWorklogCard.metrics`를 normalized read contract에 맞춰 non-null `ApiWorklogMetrics`로 좁힘.
- `agentfeed-frontend/src/lib/adapters.ts`
  - `safeUser` 제거: user `id/display_name` 누락 시 fallback identity 생성 금지.
  - `safeSocialStats` 제거: social count 누락/음수/비정상 값은 zero로 숨기지 않고 `Frontend adapter contract mismatch`.
  - `adaptMetrics`의 `metrics:null` empty object fallback 제거.
  - `adaptWorklogCard`가 normalized `author`, `metrics`, `social` shape를 확인한 뒤 렌더링 shape로 변환.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid normalized card preserve 회귀 유지.
  - malformed `author.display_name`, `metrics:null`, `social:null`, negative social count fail-closed 회귀 추가.
  - user list adapter도 normalized identity 누락을 fail-closed 하도록 회귀 보강.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - `safeUser`, `safeSocialStats`, `if (!m)` metrics fallback 재도입 방지 source guard 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] Project adapter의 owner/stats/tag fallback 중 read normalizer 이후 contract mismatch를 숨기는 부분이 남아있는지 점검.
- [ ] Worklog source/viewer_state nullable 처리 중 API contract상 허용된 null과 masking fallback을 구분 점검.
