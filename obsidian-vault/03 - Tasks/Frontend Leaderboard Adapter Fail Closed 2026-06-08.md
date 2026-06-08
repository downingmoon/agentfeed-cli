---
title: Frontend Leaderboard Adapter Fail Closed 2026-06-08
aliases:
  - Leaderboard adapter fail closed
status: done
date: 2026-06-08
tags:
  - agentfeed/frontend
  - agentfeed/contract
  - agentfeed/ux
  - agentfeed/evidence
---

# Frontend Leaderboard Adapter Fail Closed 2026-06-08

> [!success] 완료
> Leaderboard page의 UI adapter가 malformed ranking row를 빈 배열/부분 리스트로 조용히 제거하지 않고, 명확한 오류로 fail-closed 하도록 보강했다.

## 변경 요약

- `agentfeed-frontend/src/lib/leaderboard-adapter.ts`
  - `safeLeaderboardItems`가 non-array 입력을 `[]`로 바꾸지 않고 오류를 던진다.
  - malformed row를 `filter`로 제거하지 않고 row index와 필드를 포함한 오류를 던진다.
  - `rank`, `user`, `main_metric`, `secondary_metric`, `viewer_state`를 adapter boundary에서 재확인한다.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid leaderboard row는 보존되는지 확인한다.
  - malformed leaderboard rows는 조용히 drop되지 않고 `Leaderboard API returned malformed ranking rows` 오류를 내는지 확인한다.
- `agentfeed-frontend/src/lib/page-source-contract.test.ts`
  - Leaderboard page source contract 문구를 filter/drop에서 validate/fail-closed 방향으로 갱신했다.

## 검증 Evidence

```bash
npm run test:contracts
# passed

npm run lint
# tsc --noEmit passed
```

## 계약상 의미

- Backend/API의 leaderboard contract가 깨졌을 때 Frontend가 순위 일부만 보여주며 문제를 숨기지 않는다.
- 사용자는 기존 Leaderboard error state를 통해 API 문제를 명확히 확인한다.
- CLI-API-Frontend 전체 방향인 “계약 불일치 조용히 무시 금지”에 맞게 UI adapter도 fail-closed로 정렬했다.

## 후행 과제

- [ ] 다른 page-local `safe*` adapter가 malformed API row를 조용히 drop하는지 추가 점검한다.
