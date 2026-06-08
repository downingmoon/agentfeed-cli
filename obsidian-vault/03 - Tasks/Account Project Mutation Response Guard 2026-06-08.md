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

# Account Project Mutation Response Guard 2026-06-08

## 결론

Frontend가 일부 mutation 성공 응답을 TypeScript 타입만 믿고 그대로 UI 상태로 사용하던 gap을 줄였다. 특히 project create/update, profile update, username update, settings read/update는 사용자가 즉시 화면에서 상태 변화를 확인하는 영역이므로 malformed `200 OK`가 들어오면 Enterprise 품질 관점에서 조용한 상태 오염이 될 수 있었다.

## 수정

- `agentfeed-frontend/src/lib/api.ts`
  - project create/update 응답에 `normalizeProjectMutationResponse` 적용.
  - profile update 응답에 `normalizeProfileMutationResponse` 적용.
  - username update 응답에 `normalizeSetUsernameResponse` 적용.
  - settings read/update 응답에 `normalizeUserSettings` 적용.
  - visibility enum, ISO date, required string, nullable string, boolean section fields를 fail-closed 검증.
- `agentfeed-frontend/src/lib/api-contract.test.ts`
  - project mutation malformed visibility/slug/tags/date rejection 추가.
  - profile/username malformed identity rejection 추가.
  - settings missing section / invalid visibility / non-boolean field rejection 추가.

## 검증 Evidence

```bash
cd /Users/downing/PersonalProjects/agentfeed-frontend
npm run test:contracts
npm run lint
```

결과:

- `npm run test:contracts` 통과.
- `npm run lint` / `tsc --noEmit` 통과.

## 후행 과제

- 아직 모든 typed mutation response가 runtime guard로 닫힌 것은 아니다. 다음 후보:
  - `moderation.updateReportStatus`
  - `me.markNotificationRead`
  - `worklogs.create/update`
  - `worklogs.addComment`
- Dev OpenAPI gate는 주요 response field/schema를 검사하지만 Frontend runtime guard와 1:1 매칭 여부는 계속 확장해야 한다.
