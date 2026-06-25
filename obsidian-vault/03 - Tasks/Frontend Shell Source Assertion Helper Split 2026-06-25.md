---
title: Frontend Shell Source Assertion Helper Split 2026-06-25
aliases:
  - Shell source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Shell Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/shell-source-assertions.ts`가 54 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 shell source-contract 문자열 검사를 backend I/O boundary, static docs/info pages, app route/security, CI/deploy contract helper 4개로 분리했다.

## 변경

- `shell-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `shell-boundary-source-assertions.ts`
  - `shell-static-page-source-assertions.ts`
  - `shell-route-source-assertions.ts`
  - `shell-ci-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `dcdba7c` — `Split shell source assertions`

## 검증

- `npm run test:contracts -- src/lib/shell-source-contract.test.ts` 통과.
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
10 src/lib/shell-source-assertions.ts
12 src/lib/shell-boundary-source-assertions.ts
15 src/lib/shell-static-page-source-assertions.ts
16 src/lib/shell-route-source-assertions.ts
20 src/lib/shell-ci-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
51 src/lib/api-boundary-worklog-source-assertions.ts
50 src/lib/worklog-review-page-source-assertions.ts
44 src/lib/project-source-assertions.ts
41 src/lib/search-source-assertions.ts
40 src/lib/review-public-user-assets-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `shell-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `api-boundary-worklog-source-assertions.ts` at 51 pure LOC.
- [ ] Keep `shell-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 6 commits; triggers 5-commit push/deploy threshold.
