---
title: Frontend Visible Mutation Failure Contract 2026-06-08
aliases:
  - Frontend optimistic action failure guard
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Visible Mutation Failure Contract 2026-06-08

> [!success]
> Frontend에 남아 있던 `.catch(() => ...)` 후보를 재검토했다. 생산 코드는 이미 실패 시 rollback과 사용자-visible error copy를 수행하고 있었으므로 신규 기능은 추가하지 않고, 해당 동작이 다시 조용한 실패로 퇴행하지 않도록 source contract를 보강했다.

## 변경 범위

- Frontend `src/lib/page-source-contract.test.ts`
  - Feed rising-builder follow/unfollow 실패 시 다음 조건을 계약으로 고정:
    - stale error clear
    - duplicate pending lock
    - optimistic state update
    - 실패 rollback
    - 사용자-visible recovery copy
    - pending release
  - AppContext optimistic like/bookmark 실패 시 다음 조건을 계약으로 고정:
    - 사용자-visible recovery copy
    - optimistic state rollback
    - pending release

## 검증 Evidence

```text
npx tsx src/lib/page-source-contract.test.ts
=> passed

npm run lint
=> prelint clean-next-types + tsc --noEmit passed

npm run test:contracts
=> passed
```

## 판단

- 이번 작업은 신규 기능 추가가 아니라, 이미 존재하는 오류 표시/rollback 동작을 enterprise 품질의 회귀 방지 계약으로 고정한 작업이다.
- 서버/인프라/CICD 작업 및 서버 배포는 수행하지 않았다.

## 후행 과제

- [ ] UI mutation error copy가 한국어/영어 혼용 없이 제품 톤에 맞는지 별도 copy QA에서 점검한다.
- [ ] 실제 브라우저에서 like/bookmark/follow 네트워크 실패를 강제로 발생시키는 visual smoke는 다음 UX QA slice에서 필요 시 수행한다.

## 관련 노트

- [[Frontend Social Response Guard 2026-06-08]]
- [[Remaining Mutation Response Guard 2026-06-08]]
- [[Active Tasks]]
