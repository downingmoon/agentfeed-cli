---
title: Remaining Read Response Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - dashboard
  - notifications
  - discovery
---

# Remaining Read Response Guard 2026-06-08

## 결론

Dashboard, activity, moderation, notification, suggestion, tag 응답이 raw typed payload로 통과하던 부분을 Frontend API boundary에서 fail-closed 처리했다. 이 응답들은 authenticated dashboard와 운영/알림/discovery UI 상태를 직접 만들기 때문에 malformed `200 OK`가 조용히 렌더링되면 안 된다.

> [!success] 완료
> 남은 주요 read/list payload의 counters, dates, statuses, notification target/actor, moderation report enum, discovery type/tag count가 계약과 다르면 Frontend가 502 contract mismatch로 중단한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `moderation.listReports` response guard 추가.
  - `users.activity` response guard 추가.
  - `search.suggestions` / `explore.tags` discovery guard 추가.
  - `me.dashboardSummary` / `me.dashboardRecentWorklogs` guard 추가.
  - `me.notifications` item-level guard 추가. Backend `NotificationTarget.extra=allow`에 맞춰 extra target fields는 보존하되 `type/id/title`은 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid dashboard/activity/moderation/notification/discovery payload preserve 테스트 추가.
  - malformed report status, negative dashboard counters, unknown recent worklog status, malformed notification read flag, malformed activity token count, unknown suggestion type, malformed tag count rejection 추가.

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

- `users.projects`, `projects.list`, `leaderboard.get`, `me.integrations`, `projects.get/detail` read payload boundary audit.
- Delete/report/read-all `{ ok: true }` response guard를 추가할지 검토.
- Broad completion claim 전 Browser smoke로 dashboard/notifications/search/explore/feed authenticated/public surfaces를 다시 검증.
