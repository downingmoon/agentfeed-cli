---
title: Leaderboard Period Type Contract Guard 2026-06-08
date: 2026-06-08
status: completed
tags:
  - agentfeed/contracts
  - agentfeed/frontend
  - agentfeed/backend
  - project/tasks
aliases:
  - Leaderboard period type guard
---

# Leaderboard Period Type Contract Guard 2026-06-08

> [!success] 완료
> Backend `LeaderboardPeriod`는 `today | week | month | all` closed `Literal`이고 Frontend parser도 이미 unknown period를 reject하고 있었지만, `ApiLeaderboardResponse.period` export type이 `string`으로 다시 열려 있었다. Response type을 `LeaderboardPeriod`로 좁혀 parser output과 downstream consumer contract를 일치시켰다.

## 배경

[[Active Tasks]]의 contract hardening 흐름에서 Search/Leaderboard query 값은 이미 닫혀 있었지만, Frontend normalized response type 중 `period`만 broad string으로 남아 있었다. 이는 parser가 닫은 값을 타입 레벨에서 다시 열어 downstream 컴포넌트나 adapter가 unknown period를 허용할 수 있는 drift다.

## 변경 범위

### Frontend

- `src/lib/api.ts`
  - `ApiLeaderboardResponse.period: string` → `LeaderboardPeriod`.
  - `LEADERBOARD_TYPES`를 `readonly LeaderboardType[]`로 명시.
  - `LEADERBOARD_PERIODS`를 `readonly LeaderboardPeriod[]`로 명시.
- `src/lib/page-source-contract.test.ts`
  - Leaderboard response period type이 broad string으로 재개방되지 않도록 source guard 추가.
  - period parser value set이 `LeaderboardPeriod`와 함께 움직이도록 source guard 추가.

### Backend

- 코드 변경 없음.
- `tests/test_contracts.py::test_discovery_query_filter_contracts_are_literal_typed`가 Backend `LeaderboardPeriod`, router annotation, invalid period rejection을 이미 검증한다.

## 검증 Evidence

```bash
# Frontend
npm run test:contracts
npm run lint

# Backend targeted evidence
uv run pytest tests/test_contracts.py::test_discovery_query_filter_contracts_are_literal_typed

# CLI/docs regression
npm run release:preflight
```

- Frontend contract/lint: 통과.
- Backend targeted: `1 passed`.
- CLI release preflight: `27 test files`, `568 tests passed`.

## 후행 과제

> [!todo]
> 이번 slice는 type-level drift만 닫았다. 다음 contract pass에서는 response DTO 중 parser는 닫혀 있지만 exported interface가 broad primitive로 남은 필드를 계속 스캔한다.
