---
title: Worklog Detail Response Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - worklog-detail
  - multi-agent
---

# Worklog Detail Response Guard 2026-06-08

## 결론

`worklogs.get(id)`가 public worklog detail payload를 raw typed response로 신뢰하던 부분을 Frontend API boundary에서 fail-closed 처리했다. 상세 페이지는 published feed의 핵심 read surface이고, multi-agent evidence(`models_used`, `agent_metrics`, `agent_modes`, collection sources)를 그대로 보여주므로 malformed `200 OK`가 UI에 조용히 섞이면 안 된다.

> [!success] 완료
> Worklog detail 응답의 author, project, metrics, source, outcome, timeline, privacy scan, social stats, viewer state, timestamp가 계약과 다르면 Frontend가 502 contract mismatch로 중단한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeWorklogDetailResponse` 추가.
  - `worklogs.get`을 `DataResponse<unknown>`으로 받은 뒤 runtime guard를 통과한 payload만 반환하도록 변경.
  - multi-agent metric summary의 token/action/count fields를 non-negative number/null로 검증.
  - outcome/timeline/social/viewer/project/source/privacy scan 구조를 fail-closed 검증.
  - Backend detail schema에 존재하는 `updated_at`을 Frontend `ApiWorklog` 타입에 반영.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid worklog detail payload preserve 테스트 추가.
  - malformed author, agent metric token count, legacy outcome string, unknown timeline status, negative social count, malformed viewer state, malformed project summary rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- TypeScript targeted check: 통과.
- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- Dev OpenAPI contract gate: 통과, operations 75 / frontend client contracts 63 / schema field contracts 175.

## 후행 과제

- Feed/profile/project/explore worklog list row payload를 API boundary에서 `normalizeListResponse` 이후 item-level guard로 보강할지 검토.
- `search.query`, `explore.get`, `users.activity`, `moderation.listReports` read/list payload fail-safe audit.
- Worklog detail guard와 backend OpenAPI schema field gate가 `updated_at`, `agent_metrics` 세부 필드까지 계속 동기화되는지 회귀 테스트 확장 검토.
