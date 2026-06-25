---
title: Frontend Search Source Assertion Helper Split 2026-06-25
aliases:
  - Search source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Search Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/search-source-assertions.ts`가 41 pure LOC로 다음 source assertion growth-risk helper였다. Runtime/UI 동작은 바꾸지 않고 search source-contract 문자열 검사를 project result, query lifecycle, result integrity, UI/a11y helper 4개로 분리했다.

## 변경

- `search-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `search-project-result-source-assertions.ts`
  - `search-query-lifecycle-source-assertions.ts`
  - `search-result-integrity-source-assertions.ts`
  - `search-ui-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 서버 배포 없음.

## Commit

- `agentfeed-frontend` `c1bedfc` — `Split search source assertions`

## 검증

- `npm run test:contracts -- src/lib/search-source-contract.test.ts` 통과.
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
10 src/lib/search-source-assertions.ts
11 src/lib/search-project-result-source-assertions.ts
15 src/lib/search-query-lifecycle-source-assertions.ts
12 src/lib/search-result-integrity-source-assertions.ts
15 src/lib/search-ui-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
40 src/lib/review-public-user-assets-source-assertions.ts
39 src/lib/dashboard-source-assertions.ts
37 src/lib/worklog-card-list-source-assertions.ts
37 src/lib/notifications-source-assertions.ts
37 src/lib/landing-preview-source-assertions.ts
```

Contract runner scan remains healthy: max `*contract*.test.ts` runner is 5 pure LOC.

## 후행 TODO

- [x] Previous next candidate `search-source-assertions.ts` split 처리.
- [x] Continue source assertion helper re-scan candidate `review-public-user-assets-source-assertions.ts` 처리 완료. See [[Frontend Review Public User Assets Source Assertion Helper Split 2026-06-25]].
- [ ] Keep `search-source-assertions.ts` as thin orchestrator only.
- [x] 6-commit push/deploy threshold handled in [[Personal Server Deploy Local Refresh 2026-06-25#2026-06-25 — Post project/search source assertion splits threshold deploy]].
- [ ] Current next source assertion helper candidate after review-public-user-assets split: `dashboard-source-assertions.ts` at 39 pure LOC.
