---
title: Frontend Settings Profile Source Assertion Helper Split 2026-06-25
aliases:
  - Settings profile source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Settings Profile Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/settings-profile-source-assertions.ts`가 31 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 profile save delegation, username validation, action-level error copy, profile fields/body source-contract 문자열 검사를 domain helper 4개로 분리했다.

## 변경

- `settings-profile-source-assertions.ts`를 orchestration-only helper로 축소했다.
- 새 helper:
  - `settings-profile-delegation-source-assertions.ts`
  - `settings-profile-validation-source-assertions.ts`
  - `settings-profile-error-source-assertions.ts`
  - `settings-profile-fields-source-assertions.ts`
- 기존 assertion 문자열과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- 서버/인프라/CI/CD 변경 없음.
- 문서 commit 후 total unpushed counter가 6 commits라 5-commit push/deploy threshold 대상이다.

## Commit

- `agentfeed-frontend` `d178a46` — `Split settings profile source assertions`

## 검증

- `npm run test:contracts -- src/lib/settings-source-contract.test.ts` 통과.
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
10 src/lib/settings-profile-source-assertions.ts
11 src/lib/settings-profile-delegation-source-assertions.ts
8  src/lib/settings-profile-validation-source-assertions.ts
12 src/lib/settings-profile-error-source-assertions.ts
12 src/lib/settings-profile-fields-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
31 src/lib/feed-hook-a11y-source-assertions.ts
30 src/lib/project-detail-mutation-source-assertions.ts
30 src/lib/discovery-explore-source-assertions.ts
30 src/lib/brand-svg-source-assertions.ts
29 src/lib/worklog-detail-data-source-assertions.ts
29 src/lib/api-boundary-public-user-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `settings-profile-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidate is 31 pure LOC: `feed-hook-a11y-source-assertions.ts`.
- [ ] Current unpushed commit counter after this task docs: 6 commits; triggers 5-commit push/deploy threshold.
