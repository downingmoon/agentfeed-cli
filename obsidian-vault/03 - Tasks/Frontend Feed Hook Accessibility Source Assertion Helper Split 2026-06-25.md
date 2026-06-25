---
title: Frontend Feed Hook Accessibility Source Assertion Helper Split 2026-06-25
aliases:
  - Feed hook accessibility source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Feed Hook Accessibility Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/feed-hook-a11y-source-assertions.ts`가 31 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 filter ARIA, feed hook retry/cancellation, retry UI copy, global focus ring source-contract 문자열 검사를 domain helper 4개로 분리했다.

## 변경

- `feed-hook-a11y-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `feed-filter-a11y-source-assertions.ts`
  - `feed-hook-retry-source-assertions.ts`
  - `feed-retry-ui-source-assertions.ts`
  - `feed-focus-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음. 이번 문서 commit 후 unpushed counter는 3 commits라 5-commit push/deploy threshold 미만이다.

## Commit

- `agentfeed-frontend` `3f3f4fc` — `Split feed hook accessibility source assertions`

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
10 src/lib/feed-hook-a11y-source-assertions.ts
9  src/lib/feed-filter-a11y-source-assertions.ts
16 src/lib/feed-hook-retry-source-assertions.ts
8  src/lib/feed-retry-ui-source-assertions.ts
8  src/lib/feed-focus-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
30 src/lib/project-detail-mutation-source-assertions.ts
30 src/lib/discovery-explore-source-assertions.ts
30 src/lib/brand-svg-source-assertions.ts
29 src/lib/worklog-detail-data-source-assertions.ts
29 src/lib/api-boundary-public-user-source-assertions.ts
26 src/lib/feed-filter-source-assertions.ts
26 src/lib/brand-agent-glyph-source-assertions.ts
26 src/lib/auth-shell-session-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `feed-hook-a11y-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidates are 30 pure LOC: `project-detail-mutation-source-assertions.ts`, `discovery-explore-source-assertions.ts`, `brand-svg-source-assertions.ts`.
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit push/deploy threshold.
