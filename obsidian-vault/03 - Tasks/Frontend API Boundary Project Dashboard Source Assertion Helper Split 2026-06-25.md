---
title: Frontend API Boundary Project Dashboard Source Assertion Helper Split 2026-06-25
aliases:
  - API boundary project dashboard source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend API Boundary Project Dashboard Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/api-boundary-project-dashboard-source-assertions.ts`가 32 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 settings strict fields, dashboard action URL, project stats/detail/mutation/adapters source-contract 문자열 검사를 domain helper 3개로 분리했다.

## 변경

- `api-boundary-project-dashboard-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `api-boundary-settings-source-assertions.ts`
  - `api-boundary-dashboard-action-source-assertions.ts`
  - `api-boundary-project-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음. 이번 문서 commit 후 unpushed counter는 3 commits라 5-commit push/deploy threshold 미만이다.

## Commit

- `agentfeed-frontend` `697817e` — `Split API boundary project dashboard source assertions`

## 검증

- `npm run test:contracts -- src/lib/api-boundary-source-contract.test.ts` 통과.
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
8  src/lib/api-boundary-project-dashboard-source-assertions.ts
9  src/lib/api-boundary-settings-source-assertions.ts
9  src/lib/api-boundary-dashboard-action-source-assertions.ts
20 src/lib/api-boundary-project-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
31 src/lib/settings-profile-source-assertions.ts
31 src/lib/feed-hook-a11y-source-assertions.ts
30 src/lib/project-detail-mutation-source-assertions.ts
30 src/lib/discovery-explore-source-assertions.ts
30 src/lib/brand-svg-source-assertions.ts
29 src/lib/worklog-detail-data-source-assertions.ts
29 src/lib/api-boundary-public-user-source-assertions.ts
```

## 후행 TODO

- [x] Same-batch threshold push/deploy completed in [[Personal Server Deploy Local Refresh 2026-06-25#2026-06-25 — Post API-boundary project-dashboard/settings-profile source assertion splits threshold deploy]].
- [x] Source assertion helper candidate `settings-profile-source-assertions.ts` handled by [[Frontend Settings Profile Source Assertion Helper Split 2026-06-25]].
- [x] Previous next candidate `api-boundary-project-dashboard-source-assertions.ts` split 처리.
- [x] Next source assertion helper candidate `feed-hook-a11y-source-assertions.ts` handled by [[Frontend Feed Hook Accessibility Source Assertion Helper Split 2026-06-25]].
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit push/deploy threshold.
