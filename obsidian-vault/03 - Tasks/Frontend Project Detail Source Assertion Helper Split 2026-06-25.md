---
title: Frontend Project Detail Source Assertion Helper Split 2026-06-25
aliases:
  - Project detail source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Project Detail Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/project-detail-source-assertions.ts`가 63 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 project detail source-contract 문자열 검사를 route, data/worklog/owner, mutation/edit/delete, accessibility/tab helper 4개로 분리했다.

## 변경

- `project-detail-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `project-detail-route-source-assertions.ts`
  - `project-detail-data-source-assertions.ts`
  - `project-detail-mutation-source-assertions.ts`
  - `project-detail-a11y-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `8d37fb9` — `Split project detail source assertions`

## 검증

- `npm run test:contracts -- src/lib/public-profile-source-contract.test.ts` 통과.
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
10 src/lib/project-detail-source-assertions.ts
13 src/lib/project-detail-route-source-assertions.ts
16 src/lib/project-detail-data-source-assertions.ts
30 src/lib/project-detail-mutation-source-assertions.ts
15 src/lib/project-detail-a11y-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
54 src/lib/shell-source-assertions.ts
51 src/lib/api-boundary-worklog-source-assertions.ts
50 src/lib/worklog-review-page-source-assertions.ts
44 src/lib/project-source-assertions.ts
41 src/lib/search-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `project-detail-source-assertions.ts` split 처리.
- [ ] Continue source assertion helper re-scan before adding cases near 200 pure LOC. Current next candidate: `shell-source-assertions.ts` at 54 pure LOC.
- [ ] Keep `project-detail-source-assertions.ts` as thin orchestrator only.
- [ ] Current unpushed commit counter after this task docs: 3 commits; below 5-commit push/deploy threshold.
