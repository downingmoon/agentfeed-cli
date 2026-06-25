---
title: Frontend Feed Source Assertion Helper Split 2026-06-25
aliases:
  - Feed source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Feed Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/feed-source-assertions.ts`가 131 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 app shell, feed filters, sidebar/profile navigation, follow actions, feed hook/accessibility source-contract 문자열 검사를 domain helper 5개로 분리했다.

## 변경

- `feed-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `feed-app-shell-source-assertions.ts`
  - `feed-filter-source-assertions.ts`
  - `feed-sidebar-source-assertions.ts`
  - `feed-follow-action-source-assertions.ts`
  - `feed-hook-a11y-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포는 문서 commit 후 5-commit threshold 초과로 별도 push/deploy 수행 예정.

## Commit

- `agentfeed-frontend` `16c6313` — `Split feed source assertions`

## 검증

- `npm run test:contracts -- src/lib/feed-source-contract.test.ts` 통과.
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
12 src/lib/feed-source-assertions.ts
13 src/lib/feed-app-shell-source-assertions.ts
26 src/lib/feed-filter-source-assertions.ts
20 src/lib/feed-sidebar-source-assertions.ts
21 src/lib/feed-follow-action-source-assertions.ts
31 src/lib/feed-hook-a11y-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
124 src/lib/worklog-card-source-assertions.ts
96 src/lib/auth-shell-source-assertions.ts
76 src/lib/cli-authorize-source-assertions.ts
67 src/lib/auth-next-contract-assertions.ts
64 src/lib/worklog-card-actions-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `feed-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `worklog-card-source-assertions.ts` at 124 pure LOC.
- [ ] Keep `feed-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 6 commits; triggers 5-commit push/deploy threshold.
