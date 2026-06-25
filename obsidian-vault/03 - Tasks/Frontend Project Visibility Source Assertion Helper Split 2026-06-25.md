---
title: Frontend Project Visibility Source Assertion Helper Split 2026-06-25
aliases:
  - Project visibility source assertion helper split
status: done
tags:
  - agentfeed/frontend
  - agentfeed/contracts
  - project/tasks
updated: 2026-06-25
---

# Frontend Project Visibility Source Assertion Helper Split 2026-06-25

## 결론

`agentfeed-frontend/src/lib/project-visibility-source-assertions.ts`가 22 pure LOC growth-risk helper였다. Runtime/UI/API 동작은 바꾸지 않고 project visibility source-contract 검사를 select parser, raw union assertion, VisibilityBadge union assertion helpers로 분리했다.

## 변경

- `project-visibility-source-assertions.ts`를 orchestration-only loop helper로 축소했다.
- 새 helper:
  - `project-visibility-select-source-assertions.ts`
  - `project-visibility-union-source-assertions.ts`
  - `project-visibility-badge-source-assertions.ts`
- 기존 assertion 문자열/정규식과 대상 source-file contract만 이동했다.
- 신규 기능 없음.
- Runtime/UI/API 동작 변경 없음.
- 서버/인프라/CI/CD 변경 없음.
- 이 문서화 후 unpushed counter가 6 commits라 5-commit threshold push/deploy를 처리했다.

## Commit

- `agentfeed-frontend` `abeaa5b` — `Split project visibility source assertions`

## 검증

- Pre-edit regression: `npm run test:contracts -- src/lib/project-visibility-source-contract.test.ts` 통과.
- Post-edit targeted contract: `npm run test:contracts -- src/lib/project-visibility-source-contract.test.ts` 통과.
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
19 src/lib/project-visibility-source-assertions.ts
 5 src/lib/project-visibility-select-source-assertions.ts
 5 src/lib/project-visibility-union-source-assertions.ts
 5 src/lib/project-visibility-badge-source-assertions.ts
```

Current source assertion helper re-scan top after split:

```text
22 src/lib/cli-authorize-session-storage-source-assertions.ts
21 src/lib/worklog-detail-mutation-source-assertions.ts
21 src/lib/worklog-card-navigation-source-assertions.ts
21 src/lib/feed-follow-action-source-assertions.ts
21 src/lib/auth-shell-social-source-assertions.ts
21 src/lib/auth-shell-a11y-source-assertions.ts
20 src/lib/shell-ci-source-assertions.ts
20 src/lib/settings-auth-recovery-source-assertions.ts
20 src/lib/feed-sidebar-source-assertions.ts
20 src/lib/cli-authorize-retry-source-assertions.ts
```

## 후행 TODO

- [x] Previous next candidate `project-visibility-source-assertions.ts` split 처리.
- [ ] Next source assertion helper candidate is `cli-authorize-session-storage-source-assertions.ts` at 22 pure LOC.
- [x] Current unpushed commit counter after this task docs reached 6 commits; threshold push/deploy handled.
