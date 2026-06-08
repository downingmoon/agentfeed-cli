---
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
---

# Remaining Mutation Response Guard 2026-06-08

## 결론

직전 slice 이후 남아 있던 주요 typed mutation response를 Frontend runtime boundary에서 추가로 닫았다. 목적은 malformed `200 OK`가 worklog 작성/수정, 댓글 작성, moderation 상태 변경, notification read UI 상태를 조용히 오염시키지 못하게 하는 것이다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `worklogs.create` 응답을 `normalizeWorklogCreateResponse`로 검증.
  - `worklogs.update` 응답을 `normalizeWorklogUpdateResponse`로 검증.
  - `worklogs.addComment` 응답을 `normalizeCommentResponse`로 검증.
  - `moderation.updateReportStatus` 응답을 `normalizeModerationReport`로 검증.
  - `me.markNotificationRead` 응답을 `normalizeNotificationReadResponse`로 검증.
  - worklog status/visibility, moderation target/reason/status, ISO date, author identity, notification read boolean을 fail-closed 처리.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - malformed success response guard cases 추가.
  - URL/method contract mock이 guarded endpoint에 실제 성공 payload를 반환하도록 보정.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

결과:

- Frontend contract tests 통과.
- Frontend `tsc --noEmit` 통과.
- Dev OpenAPI contract gate 통과.

## 후행 과제

- `moderation.listReports`, `worklogs.get/review`, `users.activity`, `search.query`, `explore.get` 등 read/list 계열은 일부 adapter 또는 schema gate에 의존한다. 다음 audit에서는 read/list payload가 UI render boundary에서 fail-safe인지 분리 점검한다.
- `auth/cli` approval/session response도 browser login UX 핵심이므로 runtime guard 정밀도를 별도 확인한다.
