---
title: Frontend Shared Adapter Fail Closed 2026-06-08
aliases:
  - Shared adapter fail closed
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Shared Adapter Fail Closed 2026-06-08

> [!success] 완료
> Shared UI list adapters가 strict API normalizer를 통과한 rows를 다시 broad `catch`로 숨기지 않도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/adapters.ts`
  - `adaptList`의 broad `try/catch` row drop 제거.
  - worklog/user/project malformed rows는 `Frontend adapter contract mismatch`로 fail-closed.
  - public adapter의 private/unlisted/non-public filtering policy는 유지.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid rows preserve 회귀 추가.
  - malformed worklog/user/project rows throw 회귀 추가.
  - public private/unlisted filtering 회귀 유지.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - shared adapter silent row-drop comment 재도입 방지 source guard 추가.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 후행 과제

- [ ] `adaptWorklog` detail outcome/timeline local `flatMap` fallback이 Backend legacy normalization 이후에도 필요한지 점검.
- [ ] 개인서버 배포 후 public list/detail 화면에서 malformed row가 부분 UI가 아닌 명확한 오류로 드러나는지 smoke evidence 보강.
