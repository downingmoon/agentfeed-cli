---
title: Project Leaderboard Integration Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - projects
  - leaderboard
  - integrations
---

# Project Leaderboard Integration Guard 2026-06-08

## 결론

Frontend API boundary에서 project list/detail, leaderboard, integration status, `{ ok: true }` action 응답을 fail-closed로 검증하도록 보강했다. 이전에는 일부 endpoint가 TypeScript generic 또는 permissive list normalizer에 의존해 malformed `200 OK`를 빈 배열/그대로 통과시킬 수 있었다.

> [!success] 완료
> Project, leaderboard, integration status, ok action payload가 Backend 계약과 다르면 Frontend가 502 contract mismatch로 중단한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - strict list/pagination normalizer 추가.
  - `users.projects`, `projects.list`, `projects.get`, `projects.getByOwnerSlug`에 project response guard 적용.
  - project stats metric을 숫자/null로 검증하고 public metric null이 raw aggregate보다 우선되도록 유지.
  - `leaderboard.get` 응답의 type/period/items/rank/user/metric/viewer_state 검증 추가.
  - `me.integrations` 응답의 type/status/connected_at 검증 추가.
  - logout/delete/report/revoke/read-all 계열 `{ ok: true }` 응답을 false/malformed에서 fail-closed 처리.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid project/leaderboard/integration/ok payload 보존 테스트 추가.
  - missing pagination, unknown visibility, malformed stats, invalid leaderboard rank, unknown integration status, false ok response rejection 추가.
  - 기존 project detail/URL method mock payload를 새 strict contract에 맞게 갱신.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- Targeted TypeScript check: 통과.
- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- Dev OpenAPI contract gate: 통과, operations 75 / frontend client contracts 63 / schema field contracts 175.

## 후행 과제

- `normalizeUserPublic`, `auth.me`, `users.get`, `users.checkUsername`의 permissive user/account boundary를 별도 slice로 감사.
- `worklogs.comments` list item, comment mutation response, social action edge case를 별도 slice로 재검증.
- Browser smoke는 이번 목표 규칙상 서버 배포 없이 보류하고, broad completion claim 전 로컬 환경에서 feed/search/explore/project/leaderboard/settings 화면을 다시 검증.

## 관련

- [[Remaining Read Response Guard 2026-06-08]]
