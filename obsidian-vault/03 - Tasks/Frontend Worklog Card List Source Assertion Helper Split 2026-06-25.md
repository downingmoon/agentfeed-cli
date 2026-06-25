---
title: Frontend Worklog Card List Source Assertion Helper Split 2026-06-25
aliases:
  - Worklog card list source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Worklog Card List Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/worklog-card-list-source-assertions.ts`가 37 pure LOC growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 worklog card list source-contract 문자열 검사를 author/action, navigation, outcome, privacy-note helper 4개로 분리했다.

## 변경

- `worklog-card-list-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `worklog-card-author-action-source-assertions.ts`
  - `worklog-card-navigation-source-assertions.ts`
  - `worklog-card-outcome-source-assertions.ts`
  - `worklog-card-privacy-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `418a504` — `Split worklog card list source assertions`

## 검증

- `npm run test:contracts -- src/lib/worklog-card-source-contract.test.ts src/lib/discovery-dashboard-source-contract.test.ts` 통과.
- `npm run test:contracts` 통과.
- `npm run lint` 통과. (`tsc --noEmit`)
- `NEXT_PUBLIC_API_URL=https://api.agentfeed.dev npm run build` 통과. Next.js 18 static pages generated. 기존 multi-lockfile workspace-root warning만 발생.
- Changed-file no-excuse grep 통과: `as any`, `as unknown`, `@ts-ignore`, `@ts-expect-error`, empty catch, eslint-disable, TODO/FIXME 없음.
- Changed-file LOC audit 통과.
- `git diff --check` 통과.
- LSP diagnostics는 기존처럼 `Transport closed`; `tsc --noEmit`, contract tests, build로 대체 검증.
- Visual QA 미실행: runtime/UI 변경 없는 source-contract helper refactor.

## Size audit

```text
10 src/lib/worklog-card-list-source-assertions.ts
13 src/lib/worklog-card-author-action-source-assertions.ts
21 src/lib/worklog-card-navigation-source-assertions.ts
11 src/lib/worklog-card-outcome-source-assertions.ts
9 src/lib/worklog-card-privacy-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `worklog-card-list-source-assertions.ts` split 처리.
- [x] Same-batch candidate `notifications-source-assertions.ts` split 처리. See [[Frontend Notifications Source Assertion Helper Split 2026-06-25]].
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `landing-preview-source-assertions.ts` at 37 pure LOC.
- [ ] Keep `worklog-card-list-source-assertions.ts` as thin orchestrator only.
