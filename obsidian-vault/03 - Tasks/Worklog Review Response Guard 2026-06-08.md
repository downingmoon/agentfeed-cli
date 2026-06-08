---
title: Worklog Review Response Guard 2026-06-08
type: task-note
status: done
created: 2026-06-08
tags:
  - agentfeed
  - frontend
  - api-contract
  - hardening
  - worklog-review
---

# Worklog Review Response Guard 2026-06-08

## 결론

Owner review / publish flow가 `worklogs.review` payload를 raw typed response로 신뢰하던 부분을 Frontend API boundary에서 fail-closed 처리했다. 이 payload는 publish 직전 privacy/preview safety를 판단하는 데 사용되므로 malformed `200 OK`가 publish UI 상태를 오염시키면 안 된다.

> [!success] 완료
> `worklogs.review` 응답의 `worklog`, `metrics`, `source`, `privacy_scan`, `preview` 핵심 필드가 계약과 다르면 Frontend가 502 contract mismatch로 중단한다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - `normalizeWorklogReviewResponse` 추가.
  - review worklog id/title/summary/status/visibility/metrics/source 구조 검증.
  - preview card title/summary/public/private fields/safe flag 검증.
  - privacy scan findings 검증.
  - collection source quality/type 및 collection window reason 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - valid review payload preserve 테스트 추가.
  - malformed worklog/metrics/preview/privacy finding/collection source/reason rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npx tsc --target ES2022 --module commonjs --moduleResolution node --esModuleInterop --skipLibCheck --strict --noEmit src/lib/api.ts src/lib/api-contract.test.ts
npm run test:contracts
npm run lint

cd /Users/downing/PersonalProjects/agentfeed-dev
node scripts/check-openapi-contract.mjs
```

- `npm run test:contracts`: 통과.
- `npm run lint`: 통과.
- Dev OpenAPI contract gate: 통과, operations 75 / frontend client contracts 63 / schema field contracts 175.

## 후행 과제

- `worklogs.get` detail payload와 public card read/list payload adapter 경계 audit.
- `search.query`, `explore.get`, `users.activity`, `moderation.listReports` read/list payload fail-safe audit.
