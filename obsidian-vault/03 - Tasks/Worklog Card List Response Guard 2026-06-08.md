---
title: Worklog Card List Response Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - worklog-card
  - multi-agent
---

# Worklog Card List Response Guard 2026-06-08

## 결론

Feed/profile/project/explore/me bookmark/worklog list가 `normalizeListResponse<ApiWorklogCard>`로 envelope만 보정하고 row payload는 raw typed response로 신뢰하던 부분을 Frontend API boundary에서 fail-closed 처리했다. Worklog card row는 public feed의 핵심 read surface이고 multi-agent evidence가 포함되므로, malformed `200 OK` row가 조용히 UI에 섞이면 안 된다.

> [!success] 완료
> Worklog list row의 author, project, metrics, source, social stats, viewer state, timestamps, multi-agent evidence가 계약과 다르면 Frontend가 502 contract mismatch로 중단한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeWorklogCardForContract` / `normalizeWorklogCardListResponse` 추가.
  - `feed.list`, `feed.following`, `users.worklogs`, `projects.worklogs`, `explore.categoryWorklogs`, `me.worklogs`, `me.bookmarks`가 item-level guard를 통과한 row만 반환하도록 변경.
  - `ApiWorklogSource.collection_quality`를 타입에 반영해 Backend public source schema와 맞춤.
  - WorklogCard row의 multi-agent metric summary token/action fields, collection source quality/type, viewer state, social stats, embedded project shape를 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid card row + pagination preserve 테스트 추가.
  - malformed author/tags/agent_metrics/source/social/viewer/project rejection 테스트 추가.

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

- `search.query`와 `explore.get` 내부의 nested `worklogs/projects/users/prompts` arrays도 item-level guard로 확장 검토.
- `users.activity`, `moderation.listReports`, `dashboard.summary/recent-worklogs`, `notifications.list` read/list payload fail-safe audit.
- WorklogCard guard와 Backend `WorklogCard` schema field가 drift되지 않도록 Dev OpenAPI field gate coverage 확장 검토.
