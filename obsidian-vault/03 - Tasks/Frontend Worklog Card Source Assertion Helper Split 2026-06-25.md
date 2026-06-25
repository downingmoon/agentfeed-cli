---
title: Frontend Worklog Card Source Assertion Helper Split 2026-06-25
aliases:
  - Worklog card source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Worklog Card Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/worklog-card-source-assertions.ts`가 124 pure LOC로 다음 source assertion growth-risk helper였다. Runtime 동작은 바꾸지 않고 worklog author/project, feed card list/navigation/outcome, worklog detail data/comments, detail mutations/reporting, detail accessibility/profile/copy-prompt/metrics source-contract 문자열 검사를 domain helper 5개로 분리했다.

## 변경

- `worklog-card-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `worklog-card-author-source-assertions.ts`
  - `worklog-card-list-source-assertions.ts`
  - `worklog-detail-data-source-assertions.ts`
  - `worklog-detail-mutation-source-assertions.ts`
  - `worklog-detail-accessibility-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `a5bb6d2` — `Split worklog card source assertions`

## 검증

- `npm run test:contracts -- src/lib/worklog-card-source-contract.test.ts` 통과.
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
12 src/lib/worklog-card-source-assertions.ts
19 src/lib/worklog-card-author-source-assertions.ts
37 src/lib/worklog-card-list-source-assertions.ts
29 src/lib/worklog-detail-data-source-assertions.ts
21 src/lib/worklog-detail-mutation-source-assertions.ts
32 src/lib/worklog-detail-accessibility-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
96 src/lib/auth-shell-source-assertions.ts
76 src/lib/cli-authorize-source-assertions.ts
67 src/lib/api-boundary-enum-source-assertions.ts
66 src/lib/brand-assets-source-assertions.ts
65 src/lib/profile-page-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `worklog-card-source-assertions.ts` split 처리.
- [x] Continue source assertion helper re-scan candidate `auth-shell-source-assertions.ts` 처리 완료. See [[Frontend Auth Shell Source Assertion Helper Split 2026-06-25]].
- [ ] Keep `worklog-card-source-assertions.ts` as thin orchestrator only.
- [ ] Current next source assertion helper candidate after auth-shell split: `cli-authorize-source-assertions.ts` at 76 pure LOC.
- [ ] Current unpushed commit counter after auth-shell task docs: 6 commits; triggers 5-commit push/deploy threshold.
